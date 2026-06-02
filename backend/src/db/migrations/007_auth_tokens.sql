-- =====================================================================
-- 007_auth_tokens.sql
-- Password reset + member invitation tokens, and self-service onboarding.
-- Idempotent so it is safe to run against an existing live database.
-- =====================================================================

-- Single table covering both "password reset" and "invite / set password"
-- flows. The token is stored hashed (never in plaintext) and is single-use.
CREATE TABLE IF NOT EXISTS auth_tokens (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash  TEXT NOT NULL,
	purpose     VARCHAR(20) NOT NULL DEFAULT 'RESET', -- RESET | INVITE
	expires_at  TIMESTAMPTZ NOT NULL,
	used_at     TIMESTAMPTZ,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);

-- Members invited but not yet activated start inactive until they set a
-- password. is_active already exists; no schema change needed there.
