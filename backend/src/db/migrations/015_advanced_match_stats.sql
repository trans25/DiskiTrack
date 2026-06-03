-- =====================================================================
-- 015_advanced_match_stats.sql
-- Deepens the live-stats engine toward competitor parity (Hudl/Wyscout).
-- Adds richer match event types (incl. goalkeeper & defensive actions)
-- and the matching aggregated columns on player_stats so every outfield
-- position AND goalkeepers get meaningful data.
-- Every statement is idempotent and safe to run on every boot.
-- =====================================================================

-- ---------------------------------------------------------------------
-- New match_event_type values. ADD VALUE IF NOT EXISTS is idempotent and
-- (PostgreSQL 12+) safe to run here because the values are not referenced
-- in DML within this same migration.
-- ---------------------------------------------------------------------
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'SHOT_ON_TARGET';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'SAVE';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'TACKLE';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'INTERCEPTION';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'OFFSIDE';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'PENALTY_GOAL';
ALTER TYPE match_event_type ADD VALUE IF NOT EXISTS 'OWN_GOAL';

-- ---------------------------------------------------------------------
-- Aggregated per-player-per-match columns backing the new events.
-- ---------------------------------------------------------------------
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS shots_on_target SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS saves           SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS tackles         SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS interceptions   SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS offsides        SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS own_goals       SMALLINT NOT NULL DEFAULT 0;
