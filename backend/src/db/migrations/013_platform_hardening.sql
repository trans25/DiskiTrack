-- =====================================================================
-- 013_platform_hardening.sql
-- Adds the production-grade platform features:
--   * audit_log              — who did what, when (compliance/safeguarding)
--   * notifications          — in-app notification centre
--   * subscription_plans     — SaaS plan catalogue
--   * club_subscriptions     — which plan each club (tenant) is on
--   * consent_records        — POPIA/GDPR consent capture
--   * data_requests          — POPIA/GDPR export & deletion requests
--   * player_documents.*     — verification workflow columns
--   * users.*                — failed-login lockout columns
-- Every statement is idempotent so this can run on every boot.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Account lockout / security hardening on users
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- audit_log — immutable trail of important actions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID REFERENCES clubs(id) ON DELETE CASCADE,
	actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
	actor_email  VARCHAR(255),
	actor_role   VARCHAR(40),
	action       VARCHAR(80) NOT NULL,   -- e.g. PLAYER_CREATE, LOGIN_FAILURE
	entity_type  VARCHAR(60),            -- e.g. player, team, club
	entity_id    UUID,
	summary      TEXT,                   -- human-readable description
	metadata     JSONB,                  -- optional structured detail
	ip_address   VARCHAR(64),
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant   ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor    ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log(created_at);

-- ---------------------------------------------------------------------
-- notifications — in-app notification centre
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID REFERENCES clubs(id) ON DELETE CASCADE,
	user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	type         VARCHAR(40) NOT NULL DEFAULT 'INFO', -- INFO | SUCCESS | WARNING | MESSAGE | CALLUP | BILLING | SYSTEM
	title        VARCHAR(160) NOT NULL,
	body         TEXT,
	link         VARCHAR(255),       -- optional in-app route to open
	is_read      BOOLEAN NOT NULL DEFAULT FALSE,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ---------------------------------------------------------------------
-- subscription_plans — global SaaS plan catalogue (no tenant_id)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
	id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	code            VARCHAR(40) NOT NULL UNIQUE,   -- FREE | STARTER | PRO | ENTERPRISE
	name            VARCHAR(80) NOT NULL,
	price_cents     INT NOT NULL DEFAULT 0,        -- monthly price in cents (ZAR)
	currency        VARCHAR(3) NOT NULL DEFAULT 'ZAR',
	max_teams       INT,                           -- NULL = unlimited
	max_players     INT,                           -- NULL = unlimited
	features        JSONB NOT NULL DEFAULT '[]',
	is_active       BOOLEAN NOT NULL DEFAULT TRUE,
	sort_order      INT NOT NULL DEFAULT 0,
	created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_plans_updated ON subscription_plans;
CREATE TRIGGER trg_plans_updated
	BEFORE UPDATE ON subscription_plans
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the default plan catalogue (idempotent on code).
INSERT INTO subscription_plans (code, name, price_cents, currency, max_teams, max_players, features, sort_order)
VALUES
	('FREE',      'Free',        0,     'ZAR', 2,    40,   '["Up to 2 teams","Up to 40 players","Live match tracking","Standings"]', 1),
	('STARTER',   'Starter',     49900, 'ZAR', 6,    150,  '["Up to 6 teams","Up to 150 players","Email messaging","Match call-ups","Contracts"]', 2),
	('PRO',       'Pro',         99900, 'ZAR', 20,   600,  '["Up to 20 teams","Up to 600 players","Advanced analytics","Audit log","Priority support"]', 3),
	('ENTERPRISE','Enterprise',  249900,'ZAR', NULL, NULL, '["Unlimited teams","Unlimited players","All features","Dedicated support","Custom onboarding"]', 4)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- club_subscriptions — one active subscription row per club (tenant)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_subscriptions (
	id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	plan_id            UUID NOT NULL REFERENCES subscription_plans(id),
	status             VARCHAR(20) NOT NULL DEFAULT 'TRIALING', -- TRIALING | ACTIVE | PAST_DUE | CANCELLED
	provider           VARCHAR(30),            -- payfast | paystack | stripe | manual
	provider_ref       VARCHAR(160),           -- external subscription id
	current_period_end TIMESTAMPTZ,
	trial_ends_at      TIMESTAMPTZ,
	created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_club_subscription UNIQUE (tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_club_subscriptions_tenant ON club_subscriptions(tenant_id);

DROP TRIGGER IF EXISTS trg_club_subscriptions_updated ON club_subscriptions;
CREATE TRIGGER trg_club_subscriptions_updated
	BEFORE UPDATE ON club_subscriptions
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Put every existing club on the FREE plan if they have no subscription yet.
INSERT INTO club_subscriptions (tenant_id, plan_id, status)
SELECT c.id, p.id, 'ACTIVE'
  FROM clubs c
  CROSS JOIN subscription_plans p
 WHERE p.code = 'FREE'
   AND NOT EXISTS (SELECT 1 FROM club_subscriptions s WHERE s.tenant_id = c.id)
ON CONFLICT (tenant_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- billing_invoices — simple invoice ledger per club
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_invoices (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	plan_code     VARCHAR(40),
	amount_cents  INT NOT NULL DEFAULT 0,
	currency      VARCHAR(3) NOT NULL DEFAULT 'ZAR',
	status        VARCHAR(20) NOT NULL DEFAULT 'PAID', -- PAID | DUE | FAILED
	provider      VARCHAR(30),
	provider_ref  VARCHAR(160),
	issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id);

-- ---------------------------------------------------------------------
-- consent_records — POPIA/GDPR consent capture
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_records (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID REFERENCES clubs(id) ON DELETE CASCADE,
	user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
	subject_type VARCHAR(40) NOT NULL DEFAULT 'USER', -- USER | PLAYER | GUARDIAN
	subject_id   UUID,
	consent_type VARCHAR(60) NOT NULL,   -- DATA_PROCESSING | MINOR_DATA | MARKETING
	granted      BOOLEAN NOT NULL DEFAULT TRUE,
	version      VARCHAR(20) NOT NULL DEFAULT '1.0',
	ip_address   VARCHAR(64),
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_tenant ON consent_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_user   ON consent_records(user_id);

-- ---------------------------------------------------------------------
-- data_requests — POPIA/GDPR data export & "right to be forgotten"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_requests (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID REFERENCES clubs(id) ON DELETE CASCADE,
	user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	request_type VARCHAR(20) NOT NULL,   -- EXPORT | DELETE
	status       VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED | REJECTED
	notes        TEXT,
	resolved_at  TIMESTAMPTZ,
	resolved_by  UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_requests_tenant ON data_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_user   ON data_requests(user_id);

-- ---------------------------------------------------------------------
-- player_documents — verification workflow columns
-- ---------------------------------------------------------------------
ALTER TABLE player_documents ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE player_documents ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE player_documents ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE player_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
