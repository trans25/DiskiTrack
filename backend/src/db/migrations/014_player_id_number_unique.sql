-- =====================================================================
-- 014_player_id_number_unique.sql
-- Prevents duplicate player ID numbers within the same club so that
-- ID-number sign-in resolves to exactly one player per tenant.
--
-- A national ID may still legitimately appear in more than one club
-- (a player who moved clubs), so the constraint is scoped per tenant
-- and ignores NULL/blank ID numbers. Idempotent and safe to re-run.
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_players_tenant_id_number
  ON players (tenant_id, id_number)
  WHERE id_number IS NOT NULL AND id_number <> '';
