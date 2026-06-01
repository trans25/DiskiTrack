-- =====================================================================
-- Migration: announcements (club notice board)
-- Safe to run against an existing database. Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS announcements (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
	title       VARCHAR(200) NOT NULL,
	body        TEXT NOT NULL,
	is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned    ON announcements(tenant_id, is_pinned);

DO $$
BEGIN
	CREATE TRIGGER trg_announcements_updated
		BEFORE UPDATE ON announcements
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
