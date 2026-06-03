
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
		('SYSTEM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN', 'PLAYER');
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
CREATE TABLE IF NOT EXISTS clubs (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name        VARCHAR(160) NOT NULL,
	slug        VARCHAR(160) NOT NULL UNIQUE,
	country     VARCHAR(80),
	city        VARCHAR(120),
	logo_url    TEXT,
	is_active   BOOLEAN NOT NULL DEFAULT TRUE,
	-- Self-registration approval workflow.
	status           VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- PENDING | APPROVED | REJECTED
	proof_document   TEXT,          -- base64 data URI of the uploaded proof
	proof_filename   VARCHAR(255),
	rejection_reason TEXT,
	reviewed_at      TIMESTAMPTZ,
	reviewed_by      UUID,
	contact_email    VARCHAR(255),
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);

DROP TRIGGER IF EXISTS trg_clubs_updated ON clubs;
CREATE TRIGGER trg_clubs_updated
	BEFORE UPDATE ON clubs
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- users
--   tenant_id NULL only for SYSTEM_ADMIN (cross-tenant super user)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
	BEFORE UPDATE ON users
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- auth_tokens — password reset + member invitation (single-use, hashed)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash  TEXT NOT NULL,
	purpose     VARCHAR(20) NOT NULL DEFAULT 'RESET',
	expires_at  TIMESTAMPTZ NOT NULL,
	used_at     TIMESTAMPTZ,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);

-- ---------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	name        VARCHAR(160) NOT NULL,
	age_group   age_group NOT NULL,
	category    team_category NOT NULL,
	logo_url    TEXT,
	coach_id    UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_teams_identity UNIQUE (tenant_id, name, age_group, category)
);

CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach_id  ON teams(coach_id);

DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated
	BEFORE UPDATE ON teams
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	team_id       UUID REFERENCES teams(id) ON DELETE SET NULL,
	first_name    VARCHAR(120) NOT NULL,
	last_name     VARCHAR(120) NOT NULL,
	date_of_birth DATE,
	-- Identity & contact (a club registers players against an ID + email).
	id_number     VARCHAR(40),
	email         VARCHAR(255),
	-- Optional self-service login account for the player.
	user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
	position      VARCHAR(40),
	jersey_number SMALLINT,
	photo_url     TEXT,
	is_active     BOOLEAN NOT NULL DEFAULT TRUE,
	-- Contract lifecycle (the way a club tracks a player's deal).
	contract_start      DATE,
	contract_end        DATE,
	contract_renewals   SMALLINT NOT NULL DEFAULT 0,
	contract_renewed_at TIMESTAMPTZ,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_tenant_id   ON players(tenant_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id     ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id     ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_contract_end ON players(contract_end);

DROP TRIGGER IF EXISTS trg_players_updated ON players;
CREATE TRIGGER trg_players_updated
	BEFORE UPDATE ON players
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- matches
--   A match always involves at least one of THIS club's teams. The other
--   side may be an external opponent that does not exist in the system, in
--   which case its team_id is NULL and its name is stored as a free-text
--   label (home_team_label / away_team_label).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
	id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	home_team_id    UUID REFERENCES teams(id) ON DELETE CASCADE,
	away_team_id    UUID REFERENCES teams(id) ON DELETE CASCADE,
	home_team_label VARCHAR(200),
	away_team_label VARCHAR(200),
	venue           VARCHAR(200),
	scheduled_at    TIMESTAMPTZ NOT NULL,
	status          match_status NOT NULL DEFAULT 'SCHEDULED',
	home_score      SMALLINT NOT NULL DEFAULT 0,
	away_score      SMALLINT NOT NULL DEFAULT 0,
	kickoff_at      TIMESTAMPTZ,
	finished_at     TIMESTAMPTZ,
	video_url       TEXT,
	home_formation  VARCHAR(20),
	away_formation  VARCHAR(20),
	created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
	-- The two sides must not be the same internal team.
	CONSTRAINT chk_distinct_teams
		CHECK (home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id),
	-- Each side is either an internal team OR has a label (never neither).
	CONSTRAINT chk_home_side CHECK (home_team_id IS NOT NULL OR home_team_label IS NOT NULL),
	CONSTRAINT chk_away_side CHECK (away_team_id IS NOT NULL OR away_team_label IS NOT NULL),
	-- At least one side must be a real team belonging to this club.
	CONSTRAINT chk_at_least_one_internal
		CHECK (home_team_id IS NOT NULL OR away_team_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_matches_tenant_id    ON matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_matches_status       ON matches(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_home_team    ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team    ON matches(away_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_at ON matches(scheduled_at);

DROP TRIGGER IF EXISTS trg_matches_updated ON matches;
CREATE TRIGGER trg_matches_updated
	BEFORE UPDATE ON matches
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- match_lineups
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_lineups (
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

CREATE INDEX IF NOT EXISTS idx_lineups_tenant_id ON match_lineups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lineups_match_id  ON match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_lineups_player_id ON match_lineups(player_id);

DROP TRIGGER IF EXISTS trg_lineups_updated ON match_lineups;
CREATE TRIGGER trg_lineups_updated
	BEFORE UPDATE ON match_lineups
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- match_events  (live tracking core)
--   related_player_id used e.g. for SUBSTITUTION (player coming on) or
--   the assisting player on a GOAL.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_events (
	id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	match_id          UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
	team_id           UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	player_id         UUID REFERENCES players(id) ON DELETE SET NULL,
	related_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
	event_type        match_event_type NOT NULL,
	minute            SMALLINT,
	video_seconds     INTEGER,
	notes             TEXT,
	created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON match_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_match_id  ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_events_player_id ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_events_type      ON match_events(match_id, event_type);

DROP TRIGGER IF EXISTS trg_events_updated ON match_events;
CREATE TRIGGER trg_events_updated
	BEFORE UPDATE ON match_events
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- player_stats  (aggregated per player per match — analytics source)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_stats (
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

CREATE INDEX IF NOT EXISTS idx_player_stats_tenant_id ON player_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_match_id  ON player_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id ON player_stats(player_id);

DROP TRIGGER IF EXISTS trg_player_stats_updated ON player_stats;
CREATE TRIGGER trg_player_stats_updated
	BEFORE UPDATE ON player_stats
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- guardians (1:1 with a GUARDIAN user account)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardians (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	phone        VARCHAR(40),
	relationship VARCHAR(60),
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_guardian_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_guardians_tenant_id ON guardians(tenant_id);

DROP TRIGGER IF EXISTS trg_guardians_updated ON guardians;
CREATE TRIGGER trg_guardians_updated
	BEFORE UPDATE ON guardians
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- guardian_players (M:N — which players a guardian may view)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardian_players (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
	player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT uq_guardian_player UNIQUE (guardian_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_guardian_players_tenant_id ON guardian_players(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guardian_players_player_id ON guardian_players(player_id);

DROP TRIGGER IF EXISTS trg_guardian_players_updated ON guardian_players;
CREATE TRIGGER trg_guardian_players_updated
	BEFORE UPDATE ON guardian_players
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- announcements (club notice board)
--   Posted by CLUB_ADMIN / COACH; visible to the whole club. `is_pinned`
--   keeps important notices at the top of the board.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id   UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
	team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
	title       VARCHAR(200) NOT NULL,
	body        TEXT NOT NULL,
	is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned    ON announcements(tenant_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_announcements_team_id   ON announcements(team_id);

DROP TRIGGER IF EXISTS trg_announcements_updated ON announcements;
CREATE TRIGGER trg_announcements_updated
	BEFORE UPDATE ON announcements
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- training_sessions / training_attendance
--   Coaches schedule training for their teams and record per-player
--   availability/attendance.
-- ---------------------------------------------------------------------
DO $$
BEGIN
	CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'INJURED', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

DROP TRIGGER IF EXISTS trg_training_sessions_updated ON training_sessions;
CREATE TRIGGER trg_training_sessions_updated
	BEFORE UPDATE ON training_sessions
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

DROP TRIGGER IF EXISTS trg_training_attendance_updated ON training_attendance;
CREATE TRIGGER trg_training_attendance_updated
	BEFORE UPDATE ON training_attendance
	FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- player_documents (ID copies, registration forms, medicals — base64)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_documents (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
	doc_type     VARCHAR(40) NOT NULL DEFAULT 'OTHER',
	file_name    VARCHAR(255),
	file_data    TEXT NOT NULL,
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

-- ---------------------------------------------------------------------
-- club_messages (coach broadcast / targeted email log)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS club_messages (
	id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	tenant_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
	sender_id    UUID REFERENCES users(id) ON DELETE SET NULL,
	subject      VARCHAR(200) NOT NULL,
	body         TEXT NOT NULL,
	audience     VARCHAR(30) NOT NULL DEFAULT 'CUSTOM',
	team_id      UUID REFERENCES teams(id) ON DELETE SET NULL,
	match_id     UUID REFERENCES matches(id) ON DELETE SET NULL,
	recipient_count SMALLINT NOT NULL DEFAULT 0,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_messages_tenant_id ON club_messages(tenant_id);

-- ---------------------------------------------------------------------
-- match_callups (the travelling squad for a fixture)
-- ---------------------------------------------------------------------
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