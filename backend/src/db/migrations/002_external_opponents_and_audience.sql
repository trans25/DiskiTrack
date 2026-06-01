-- =====================================================================
-- Migration: external opponents on matches + announcement audience
-- Safe to run against an existing database. Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- matches: allow an external (non-system) opponent on one side.
-- ---------------------------------------------------------------------
ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_team_label VARCHAR(200);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_team_label VARCHAR(200);

-- Replace the old "distinct teams" check with NULL-aware constraints.
ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_distinct_teams;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_home_side;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_away_side;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS chk_at_least_one_internal;

ALTER TABLE matches ADD CONSTRAINT chk_distinct_teams
	CHECK (home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id);
ALTER TABLE matches ADD CONSTRAINT chk_home_side
	CHECK (home_team_id IS NOT NULL OR home_team_label IS NOT NULL);
ALTER TABLE matches ADD CONSTRAINT chk_away_side
	CHECK (away_team_id IS NOT NULL OR away_team_label IS NOT NULL);
ALTER TABLE matches ADD CONSTRAINT chk_at_least_one_internal
	CHECK (home_team_id IS NOT NULL OR away_team_id IS NOT NULL);

-- ---------------------------------------------------------------------
-- announcements: optional team audience targeting.
-- ---------------------------------------------------------------------
ALTER TABLE announcements
	ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_announcements_team_id ON announcements(team_id);
