-- =====================================================================
-- Migration: team logos
-- Adds a per-team logo/crest URL so each team can show its badge.
-- Safe to run against an existing database. Idempotent.
-- =====================================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url TEXT;
