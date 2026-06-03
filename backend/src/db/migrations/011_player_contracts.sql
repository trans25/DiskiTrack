-- =====================================================================
-- 011_player_contracts.sql
-- Player contracts, the way a real club tracks them:
--   * contract_start / contract_end  -> the term of the deal
--   * contract_renewals              -> how many times it has been renewed
--   * contract_renewed_at            -> when it was last renewed
-- "Years left" and contract status (active / expiring / expired) are derived
-- from contract_end at read time, so they are always current.
-- Idempotent: safe to run on every boot.
-- =====================================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS contract_end DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS contract_renewals SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS contract_renewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_players_contract_end ON players(contract_end);