-- =====================================================================
-- 009_reviews.sql
-- Public product reviews / testimonials.
--   * Anyone can leave a review (name, optional role, rating, comment).
--   * is_published is FALSE by default: a SYSTEM_ADMIN must approve a
--     review before it appears on the public landing page.
-- Idempotent so it is safe to run against the live database on every boot.
-- =====================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  role         VARCHAR(120),
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published, created_at DESC);
