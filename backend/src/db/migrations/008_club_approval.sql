-- =====================================================================
-- 008_club_approval.sql
-- Club self-registration approval workflow.
--   * Clubs start PENDING and must be approved by a SYSTEM_ADMIN.
--   * Applicants upload a proof document (stored as a base64 data URI).
-- Idempotent so it is safe against the live database.
-- =====================================================================

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS proof_document TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS proof_filename VARCHAR(255);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- Existing clubs (seeded demo data) are treated as already approved; only new
-- self-service registrations will be created as PENDING.

CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);
