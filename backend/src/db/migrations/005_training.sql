-- =====================================================================
-- Migration: training sessions & player availability
-- Coaches schedule training sessions for their teams and record each
-- player's availability/attendance. Tenant-scoped and team-linked.
-- Safe to run against an existing database. Idempotent.
-- =====================================================================

DO $$
BEGIN
	CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'INJURED', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- training_sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_sessions (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	title        VARCHAR(200) NOT NULL,
	location     VARCHAR(200),
	focus        TEXT,
	scheduled_at TIMESTAMPTZ NOT NULL,
	duration_min SMALLINT,
	created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_tenant_id ON training_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_team_id   ON training_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_when      ON training_sessions(scheduled_at);

DO $$
BEGIN
	CREATE TRIGGER trg_training_sessions_updated
		BEFORE UPDATE ON training_sessions
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- training_attendance  (per player, per session)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_attendance (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	session_id  UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
	player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	status      attendance_status NOT NULL DEFAULT 'UNKNOWN',
	note        VARCHAR(200),
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_attendance_player UNIQUE (session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_tenant_id  ON training_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_session_id ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player_id  ON training_attendance(player_id);

DO $$
BEGIN
	CREATE TRIGGER trg_training_attendance_updated
		BEFORE UPDATE ON training_attendance
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
