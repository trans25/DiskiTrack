-- =====================================================================
-- 016_match_availability.sql
-- Player self-service availability / RSVP for fixtures (TeamSnap parity).
-- A player (or their guardian) confirms whether they can play a match so
-- the coach can plan the squad. Distinct from match_callups, which is the
-- coach's final selection.
-- Every statement is idempotent and safe to run on every boot.
-- =====================================================================

DO $$
BEGIN
	CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAYBE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS match_availability (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	match_id     UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
	player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	status       availability_status NOT NULL DEFAULT 'MAYBE',
	note         TEXT,
	responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_match_availability UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_tenant_id ON match_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_match_id  ON match_availability(match_id);
CREATE INDEX IF NOT EXISTS idx_availability_player_id ON match_availability(player_id);

DROP TRIGGER IF EXISTS trg_availability_updated ON match_availability;
CREATE TRIGGER trg_availability_updated
	BEFORE UPDATE ON match_availability
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();
