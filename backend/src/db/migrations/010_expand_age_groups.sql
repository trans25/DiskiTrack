-- =====================================================================
-- 010_expand_age_groups.sql
-- Broaden the age_group enum to cover the full football pyramid that real
-- clubs and academies run: mini-football (U7-U12), the youth ladder
-- (U13-U21/U23), senior football, and reserve sides.
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent, so this is safe to
-- run on every boot. New values are appended; display order is controlled
-- by the frontend, so enum ordering here does not matter.
-- =====================================================================

ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U7';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U8';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U9';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U10';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U11';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U12';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U18';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U20';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U21';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'U23';
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'RESERVE';
