-- =====================================================================
-- Migration: match formations
-- Stores the chosen formation per side so the lineup pitch can render it.
-- Safe to run against an existing database. Idempotent.
-- =====================================================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_formation VARCHAR(20);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_formation VARCHAR(20);