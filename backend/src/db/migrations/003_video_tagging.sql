-- =====================================================================
-- Migration: video-assisted tagging
-- Adds a match video URL and a per-event video timestamp (seconds).
-- Safe to run against an existing database. Idempotent.
-- =====================================================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS video_url TEXT;

ALTER TABLE match_events ADD COLUMN IF NOT EXISTS video_seconds INTEGER;
