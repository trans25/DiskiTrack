-- =====================================================================
-- DiskiTrack — Second tenant: Cape Town City Academy
-- Adds a new club, a CLUB_ADMIN + COACH, teams and players.
-- Login: clubadmin@ctcity.fc / password123
-- Usage: psql -d diskitrack -f src/db/dummy_tenant2.sql
-- =====================================================================

WITH club AS (
  INSERT INTO clubs (name, slug, country, city)
  VALUES ('Cape Town City Academy', 'cape-town-city', 'South Africa', 'Cape Town')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id AS tenant_id
),
admin AS (
  INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
  SELECT tenant_id, 'clubadmin@ctcity.fc',
		 '$2a$10$Rdnoma3fR5/YTDsAHeoZKeqwAEJyhCzsuaGVyiNgp0zHlU6d4WOeu',
		 'Riaan', 'Adams', 'CLUB_ADMIN'
  FROM club
  ON CONFLICT (tenant_id, email) DO NOTHING
  RETURNING tenant_id
),
coach AS (
  INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
  SELECT tenant_id, 'coach@ctcity.fc',
		 '$2a$10$Rdnoma3fR5/YTDsAHeoZKeqwAEJyhCzsuaGVyiNgp0zHlU6d4WOeu',
		 'Shaun', 'Bartlett', 'COACH'
  FROM club
  ON CONFLICT (tenant_id, email) DO NOTHING
  RETURNING tenant_id
),
new_teams AS (
  INSERT INTO teams (tenant_id, name, age_group, category)
  SELECT c.tenant_id, t.name, t.age_group::age_group, t.category::team_category
  FROM club c
  CROSS JOIN (VALUES
	('CT City Senior Men',   'SENIOR', 'MEN'),
	('CT City Senior Women', 'SENIOR', 'WOMEN'),
	('CT City U19 Boys',     'U19',    'BOYS'),
	('CT City U16 Girls',    'U16',    'GIRLS')
  ) AS t(name, age_group, category)
  ON CONFLICT (tenant_id, name, age_group, category) DO NOTHING
  RETURNING id, name, tenant_id
)
SELECT 'tenant 2 created' AS info;

-- Players — Senior Men
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'cape-town-city'
CROSS JOIN (VALUES
  ('Ronwen',   'Williams', 'Goalkeeper',  1),
  ('Rushine',  'De Reuck',  'Defender',   4),
  ('Aubrey',   'Modiba',    'Defender',   3),
  ('Sphephelo','Sithole',   'Midfielder', 6),
  ('Ethan',    'Brooks',    'Midfielder', 8),
  ('Evidence', 'Makgopa',   'Forward',    9),
  ('Oswin',    'Appollis',  'Winger',     7),
  ('Iqraam',   'Rayners',   'Forward',   11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'CT City Senior Men';

-- Players — Senior Women
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'cape-town-city'
CROSS JOIN (VALUES
  ('Kaylin',   'Swart',    'Goalkeeper',  1),
  ('Karabo',   'Dhlamini', 'Defender',    5),
  ('Bongeka',  'Gamede',   'Defender',    3),
  ('Sibulele', 'Holweni',  'Defender',    2),
  ('Amogelang','Motau',    'Midfielder',  8),
  ('Gabriela', 'Salgado',  'Midfielder', 10),
  ('Melinda',  'Kgadiete', 'Forward',     9),
  ('Ronnel',   'Donnelly', 'Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'CT City Senior Women';

-- Players — U19 Boys
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'cape-town-city'
CROSS JOIN (VALUES
  ('Liam',    'Daniels',  'Goalkeeper',  1),
  ('Keegan',  'Petersen', 'Defender',    2),
  ('Asavela', 'Mbekile',  'Defender',    4),
  ('Chad',    'Saaiman',  'Midfielder',  6),
  ('Luther',  'Singh',    'Winger',      7),
  ('Caleb',   'Petersen', 'Forward',     9),
  ('Jaedin',  'Rhode',    'Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'CT City U19 Boys';

-- Players — U16 Girls
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'cape-town-city'
CROSS JOIN (VALUES
  ('Tania',    'Adams',    'Goalkeeper',  1),
  ('Chloe',    'Marengo',  'Defender',    2),
  ('Sinazo',   'Mlamla',   'Defender',    4),
  ('Robyn',    'Moodaly',  'Midfielder',  6),
  ('Aimee',    'Lategan',  'Midfielder',  8),
  ('Kelso',    'Peskin',   'Forward',     9),
  ('Olivia',   'Adams',    'Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'CT City U16 Girls';
