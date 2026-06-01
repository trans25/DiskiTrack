-- =====================================================================
-- DiskiTrack — demo seed data
-- NOTE: password hashes below are bcrypt for the password "password123".
-- Run AFTER schema.sql:  psql -d diskitrack -f src/db/seed.sql
-- =====================================================================

-- System admin (no tenant)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES (
  'admin@diskitrack.io',
  '$2a$10$Rdnoma3fR5/YTDsAHeoZKeqwAEJyhCzsuaGVyiNgp0zHlU6d4WOeu',
  'System', 'Admin', 'SYSTEM_ADMIN'
);

-- A club (tenant)
WITH club AS (
  INSERT INTO clubs (name, slug, country, city)
  VALUES ('Soweto FC', 'soweto-fc', 'South Africa', 'Johannesburg')
  RETURNING id
),
-- Club admin + coach
admin AS (
  INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
  SELECT id, 'clubadmin@soweto.fc',
		 '$2a$10$Rdnoma3fR5/YTDsAHeoZKeqwAEJyhCzsuaGVyiNgp0zHlU6d4WOeu',
		 'Thabo', 'Mokoena', 'CLUB_ADMIN'
  FROM club RETURNING tenant_id, id
),
coach AS (
  INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
  SELECT id, 'coach@soweto.fc',
		 '$2a$10$Rdnoma3fR5/YTDsAHeoZKeqwAEJyhCzsuaGVyiNgp0zHlU6d4WOeu',
		 'Lerato', 'Dlamini', 'COACH'
  FROM club RETURNING tenant_id, id
),
-- Two teams
home AS (
  INSERT INTO teams (tenant_id, name, age_group, category, coach_id)
  SELECT c.id, 'Soweto FC U17 Boys', 'U17', 'BOYS', co.id
  FROM club c, coach co RETURNING id, tenant_id
),
away AS (
  INSERT INTO teams (tenant_id, name, age_group, category)
  SELECT id, 'Soweto FC U17 Boys B', 'U17', 'BOYS' FROM club
  RETURNING id, tenant_id
)
-- A scheduled match between them
INSERT INTO matches (tenant_id, home_team_id, away_team_id, venue, scheduled_at, status)
SELECT h.tenant_id, h.id, a.id, 'Soweto Stadium', now() + interval '1 day', 'SCHEDULED'
FROM home h, away a;
