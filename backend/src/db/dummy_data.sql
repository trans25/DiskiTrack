-- =====================================================================
-- DiskiTrack — South African dummy data
-- Adds extra teams and a roster of players (SA names) to Soweto FC.
-- Idempotent-ish: re-running may create duplicate players; run once.
-- Usage: psql -d diskitrack -f src/db/dummy_data.sql
-- =====================================================================

-- Resolve the Soweto FC tenant.
WITH club AS (
  SELECT id AS tenant_id FROM clubs WHERE slug = 'soweto-fc'
),
-- Add a few more teams across age groups & categories.
new_teams AS (
  INSERT INTO teams (tenant_id, name, age_group, category)
  SELECT c.tenant_id, t.name, t.age_group::age_group, t.category::team_category
  FROM club c
  CROSS JOIN (VALUES
	('Soweto FC Senior Men',   'SENIOR', 'MEN'),
	('Soweto FC Senior Women', 'SENIOR', 'WOMEN'),
	('Soweto FC U15 Boys',     'U15',    'BOYS'),
	('Soweto FC U15 Girls',    'U15',    'GIRLS')
  ) AS t(name, age_group, category)
  ON CONFLICT (tenant_id, name, age_group, category) DO NOTHING
  RETURNING id, name, tenant_id
)
SELECT 'teams added' AS info;

-- ---------------------------------------------------------------------
-- Players for the existing U17 Boys team.
-- ---------------------------------------------------------------------
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'soweto-fc'
CROSS JOIN (VALUES
  ('Sipho',    'Khumalo',  'Goalkeeper',  1),
  ('Thabo',    'Nkosi',    'Defender',    2),
  ('Lwazi',    'Mahlangu', 'Defender',    3),
  ('Kagiso',   'Modise',   'Defender',    4),
  ('Tshepo',   'Maluleke', 'Defender',    5),
  ('Bongani',  'Zulu',     'Midfielder',  6),
  ('Katlego',  'Mokoena',  'Midfielder',  8),
  ('Lehlohonolo','Radebe', 'Midfielder', 10),
  ('Siyabonga','Ndlovu',   'Winger',      7),
  ('Themba',   'Dlamini',  'Forward',     9),
  ('Andile',   'Mthembu',  'Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'Soweto FC U17 Boys';

-- ---------------------------------------------------------------------
-- Players for the U17 Boys B team.
-- ---------------------------------------------------------------------
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'soweto-fc'
CROSS JOIN (VALUES
  ('Mandla',   'Sithole',  'Goalkeeper',  1),
  ('Lucky',    'Baloyi',   'Defender',    2),
  ('Junior',   'Mabaso',   'Defender',    3),
  ('Reneilwe', 'Letsoalo', 'Defender',    4),
  ('Oscar',    'Mashaba',  'Midfielder',  6),
  ('Teboho',   'Mokwena',  'Midfielder',  8),
  ('Vusi',     'Ngcobo',   'Winger',      7),
  ('Karabo',   'Phiri',    'Forward',     9),
  ('Gift',     'Motaung',  'Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'Soweto FC U17 Boys B';

-- ---------------------------------------------------------------------
-- Players for Senior Men.
-- ---------------------------------------------------------------------
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'soweto-fc'
CROSS JOIN (VALUES
  ('Itumeleng', 'Khune',    'Goalkeeper',  1),
  ('Siyanda',   'Xulu',     'Defender',    4),
  ('Eric',      'Mathoho',  'Defender',    5),
  ('Thabang',   'Monare',   'Midfielder',  6),
  ('Teboho',    'Mokoena',  'Midfielder',  8),
  ('Percy',     'Tau',      'Forward',    10),
  ('Themba',    'Zwane',    'Midfielder', 11),
  ('Lyle',      'Foster',   'Forward',     9),
  ('Bongokuhle','Hlongwane','Winger',      7)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'Soweto FC Senior Men';

-- ---------------------------------------------------------------------
-- Players for Senior Women.
-- ---------------------------------------------------------------------
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'soweto-fc'
CROSS JOIN (VALUES
  ('Andile',   'Dlamini',   'Goalkeeper',  1),
  ('Bambanani','Mbane',     'Defender',    5),
  ('Noko',     'Matlou',    'Defender',    4),
  ('Refiloe',  'Jane',      'Midfielder',  6),
  ('Linda',    'Motlhalo',  'Midfielder', 10),
  ('Hildah',   'Magaia',    'Forward',     9),
  ('Thembi',   'Kgatlana',  'Forward',    11),
  ('Jermaine', 'Seoposenwe','Forward',     7)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'Soweto FC Senior Women';

-- ---------------------------------------------------------------------
-- Players for U15 Boys.
-- ---------------------------------------------------------------------
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'soweto-fc'
CROSS JOIN (VALUES
  ('Neo',     'Mokete',   'Goalkeeper',  1),
  ('Lethabo', 'Sibanda',  'Defender',    2),
  ('Omphile', 'Tladi',    'Defender',    3),
  ('Bandile', 'Ngema',    'Midfielder',  6),
  ('Khanya',  'Mabena',   'Midfielder',  8),
  ('Tumelo',  'Rapula',   'Forward',     9),
  ('Wandile', 'Cele',     'Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'Soweto FC U15 Boys';

-- ---------------------------------------------------------------------
-- Players for U15 Girls.
-- ---------------------------------------------------------------------
INSERT INTO players (tenant_id, team_id, first_name, last_name, position, jersey_number)
SELECT t.tenant_id, t.id, p.first_name, p.last_name, p.position, p.jersey
FROM teams t
JOIN clubs c ON c.id = t.tenant_id AND c.slug = 'soweto-fc'
CROSS JOIN (VALUES
  ('Amahle',  'Nene',     'Goalkeeper',  1),
  ('Zinhle',  'Mkhize',   'Defender',    2),
  ('Palesa',  'Moloi',    'Defender',    4),
  ('Boitumelo','Sello',   'Midfielder',  6),
  ('Naledi',  'Mahlaba',  'Midfielder',  8),
  ('Lerato',  'Khoza',    'Forward',     9),
  ('Ayanda',  'Buthelezi','Forward',    11)
) AS p(first_name, last_name, position, jersey)
WHERE t.name = 'Soweto FC U15 Girls';
