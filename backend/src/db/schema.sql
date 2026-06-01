-- =====================================================================
-- DiskiTrack — PostgreSQL schema
-- Multi-tenant football analytics & live match tracking
-- Conventions:
--   * UUID primary keys (gen_random_uuid from pgcrypto)
--   * tenant_id (club) on every domain table for hard data isolation
--   * created_at / updated_at on every table (updated_at via trigger)
--   * 3NF normalized structure
--   * Indexes on tenant_id, match_id, player_id
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------
DO $$
BEGIN
	CREATE TYPE user_role AS ENUM
		('SYSTEM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
	CREATE TYPE age_group AS ENUM
		('U13', 'U14', 'U15', 'U16', 'U17', 'U19', 'SENIOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
	CREATE TYPE team_category AS ENUM ('BOYS', 'GIRLS', 'MEN', 'WOMEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
	CREATE TYPE match_status AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
	CREATE TYPE match_event_type AS ENUM
		('GOAL', 'ASSIST', 'SHOT', 'FOUL', 'CORNER',
		 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- clubs (tenants)
-- ---------------------------------------------------------------------
CREATE TABLE clubs (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name        VARCHAR(160) NOT NULL,
	slug        VARCHAR(160) NOT NULL UNIQUE,
	country     VARCHAR(80),
	city        VARCHAR(120),
	logo_url    TEXT,
	is_active   BOOLEAN NOT NULL DEFAULT TRUE,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clubs_updated
	BEFORE UPDATE ON clubs
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- users
--   tenant_id NULL only for SYSTEM_ADMIN (cross-tenant super user)
-- ---------------------------------------------------------------------
CREATE TABLE users (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id     UUID REFERENCES clubs(id) ON DELETE CASCADE,
	email         VARCHAR(255) NOT NULL,
	password_hash TEXT NOT NULL,
	first_name    VARCHAR(120) NOT NULL,
	last_name     VARCHAR(120) NOT NULL,
	role          user_role NOT NULL,
	is_active     BOOLEAN NOT NULL DEFAULT TRUE,
	last_login_at TIMESTAMPTZ,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email),
	CONSTRAINT chk_system_admin_tenant
		CHECK ((role = 'SYSTEM_ADMIN' AND tenant_id IS NULL)
			OR (role <> 'SYSTEM_ADMIN' AND tenant_id IS NOT NULL))
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email      ON users(email);

CREATE TRIGGER trg_users_updated
	BEFORE UPDATE ON users
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------
CREATE TABLE teams (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	name        VARCHAR(160) NOT NULL,
	age_group   age_group NOT NULL,
	category    team_category NOT NULL,
	coach_id    UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_teams_identity UNIQUE (tenant_id, name, age_group, category)
);

CREATE INDEX idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX idx_teams_coach_id  ON teams(coach_id);

CREATE TRIGGER trg_teams_updated
	BEFORE UPDATE ON teams
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------
CREATE TABLE players (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
	first_name    VARCHAR(120) NOT NULL,
	last_name     VARCHAR(120) NOT NULL,
	date_of_birth DATE,
	position      VARCHAR(40),
	jersey_number SMALLINT,
	photo_url     TEXT,
	is_active     BOOLEAN NOT NULL DEFAULT TRUE,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_tenant_id ON players(tenant_id);
CREATE INDEX idx_players_team_id   ON players(team_id);

CREATE TRIGGER trg_players_updated
	BEFORE UPDATE ON players
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------
CREATE TABLE matches (
	id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	home_team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	away_team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	venue          VARCHAR(200),
	scheduled_at   TIMESTAMPTZ NOT NULL,
	status         match_status NOT NULL DEFAULT 'SCHEDULED',
	home_score     SMALLINT NOT NULL DEFAULT 0,
	away_score     SMALLINT NOT NULL DEFAULT 0,
	kickoff_at     TIMESTAMPTZ,
	finished_at    TIMESTAMPTZ,
	created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT chk_distinct_teams CHECK (home_team_id <> away_team_id)
);

CREATE INDEX idx_matches_tenant_id    ON matches(tenant_id);
CREATE INDEX idx_matches_status       ON matches(tenant_id, status);
CREATE INDEX idx_matches_home_team    ON matches(home_team_id);
CREATE INDEX idx_matches_away_team    ON matches(away_team_id);
CREATE INDEX idx_matches_scheduled_at ON matches(scheduled_at);

CREATE TRIGGER trg_matches_updated
	BEFORE UPDATE ON matches
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- match_lineups
-- ---------------------------------------------------------------------
CREATE TABLE match_lineups (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
	team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	is_starting   BOOLEAN NOT NULL DEFAULT TRUE,
	jersey_number SMALLINT,
	position      VARCHAR(40),
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_lineup_player UNIQUE (match_id, player_id)
);

CREATE INDEX idx_lineups_tenant_id ON match_lineups(tenant_id);
CREATE INDEX idx_lineups_match_id  ON match_lineups(match_id);
CREATE INDEX idx_lineups_player_id ON match_lineups(player_id);

CREATE TRIGGER trg_lineups_updated
	BEFORE UPDATE ON match_lineups
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- match_events  (live tracking core)
--   related_player_id used e.g. for SUBSTITUTION (player coming on) or
--   the assisting player on a GOAL.
-- ---------------------------------------------------------------------
CREATE TABLE match_events (
	id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
	team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	player_id         UUID REFERENCES players(id) ON DELETE SET NULL,
	related_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
	event_type        match_event_type NOT NULL,
	minute            SMALLINT,
	notes             TEXT,
	created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_tenant_id ON match_events(tenant_id);
CREATE INDEX idx_events_match_id  ON match_events(match_id);
CREATE INDEX idx_events_player_id ON match_events(player_id);
CREATE INDEX idx_events_type      ON match_events(match_id, event_type);

CREATE TRIGGER trg_events_updated
	BEFORE UPDATE ON match_events
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- player_stats  (aggregated per player per match — analytics source)
-- ---------------------------------------------------------------------
CREATE TABLE player_stats (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
	player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	goals         SMALLINT NOT NULL DEFAULT 0,
	assists       SMALLINT NOT NULL DEFAULT 0,
	shots         SMALLINT NOT NULL DEFAULT 0,
	fouls         SMALLINT NOT NULL DEFAULT 0,
	yellow_cards  SMALLINT NOT NULL DEFAULT 0,
	red_cards     SMALLINT NOT NULL DEFAULT 0,
	minutes_played SMALLINT NOT NULL DEFAULT 0,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_player_stats UNIQUE (match_id, player_id)
);

CREATE INDEX idx_player_stats_tenant_id ON player_stats(tenant_id);
CREATE INDEX idx_player_stats_match_id  ON player_stats(match_id);
CREATE INDEX idx_player_stats_player_id ON player_stats(player_id);

CREATE TRIGGER trg_player_stats_updated
	BEFORE UPDATE ON player_stats
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- guardians (1:1 with a GUARDIAN user account)
-- ---------------------------------------------------------------------
CREATE TABLE guardians (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	phone        VARCHAR(40),
	relationship VARCHAR(60),
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_guardian_user UNIQUE (user_id)
);

CREATE INDEX idx_guardians_tenant_id ON guardians(tenant_id);

CREATE TRIGGER trg_guardians_updated
	BEFORE UPDATE ON guardians
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- guardian_players (M:N — which players a guardian may view)
-- ---------------------------------------------------------------------
CREATE TABLE guardian_players (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
	player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_guardian_player UNIQUE (guardian_id, player_id)
);

CREATE INDEX idx_guardian_players_tenant_id ON guardian_players(tenant_id);
CREATE INDEX idx_guardian_players_player_id ON guardian_players(player_id);

CREATE TRIGGER trg_guardian_players_updated
	BEFORE UPDATE ON guardian_players
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();
