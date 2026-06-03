-- =====================================================================
-- 012_player_identity_documents_messaging.sql
-- Brings the platform closer to how a real football club operates:
--   * Players carry an ID number + email + an optional linked login account
--   * A PLAYER login role so players can sign in and see their own data
--   * Player documents (registration forms, ID copies, medicals) as base64
--   * Club messaging log (coach broadcasts / targeted emails)
--   * Matchday call-ups (the travelling squad for a fixture)
-- Idempotent: safe to run on every boot.
-- =====================================================================

-- 1. New login role for players ---------------------------------------
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'PLAYER';

-- 2. Player identity + optional login account -------------------------
ALTER TABLE players ADD COLUMN IF NOT EXISTS id_number VARCHAR(40);
ALTER TABLE players ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- 3. Player documents (ID copy, registration form, medical, etc.) ------
CREATE TABLE IF NOT EXISTS player_documents (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	doc_type     VARCHAR(40) NOT NULL DEFAULT 'OTHER', -- ID | BIRTH_CERTIFICATE | REGISTRATION | MEDICAL | CONSENT | OTHER
	file_name    VARCHAR(255),
	file_data    TEXT NOT NULL,                        -- base64 data URI
	uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_documents_tenant_id ON player_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_player_documents_player_id ON player_documents(player_id);

DROP TRIGGER IF EXISTS trg_player_documents_updated ON player_documents;
CREATE TRIGGER trg_player_documents_updated
	BEFORE UPDATE ON player_documents
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Club messages (coach broadcast / targeted email log) -------------
CREATE TABLE IF NOT EXISTS club_messages (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	sender_id    UUID REFERENCES users(id) ON DELETE SET NULL,
	subject      VARCHAR(200) NOT NULL,
	body         TEXT NOT NULL,
	audience     VARCHAR(30) NOT NULL DEFAULT 'CUSTOM', -- ALL | TEAM | CALLUP | CUSTOM
	team_id      UUID REFERENCES teams(id) ON DELETE SET NULL,
	match_id     UUID REFERENCES matches(id) ON DELETE SET NULL,
	recipient_count SMALLINT NOT NULL DEFAULT 0,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_tenant_id ON club_messages(tenant_id);

-- 5. Matchday call-ups (the travelling squad for a fixture) -----------
CREATE TABLE IF NOT EXISTS match_callups (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
	player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_match_callup UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_callups_tenant_id ON match_callups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_match_callups_match_id  ON match_callups(match_id);
