import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/index.js';
import {
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
} from '../utils/mailer.js';

const toClub = (r) => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  country: r.country,
  city: r.city,
  logoUrl: r.logo_url,
  isActive: r.is_active,
  status: r.status,
  proofFilename: r.proof_filename,
  rejectionReason: r.rejection_reason,
  reviewedAt: r.reviewed_at,
  contactEmail: r.contact_email,
  createdAt: r.created_at,
});

// SYSTEM_ADMIN only — list every approved tenant.
export const listClubs = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT * FROM clubs WHERE status = 'APPROVED' ORDER BY name ASC`
  );
  res.json(rows.map(toClub));
});

export const getClub = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM clubs WHERE id = $1`, [
    req.params.id,
  ]);
  if (!rows[0]) throw ApiError.notFound('Club not found');
  res.json(toClub(rows[0]));
});

/**
 * Create a club (tenant) and optionally bootstrap its first ClubAdmin.
 * SYSTEM_ADMIN only.
 */
export const createClub = asyncHandler(async (req, res) => {
  const { name, slug, country, city, logoUrl } = req.body;
  const admin = req.body.admin; // optional { email, password, firstName, lastName }

  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO clubs (name, slug, country, city, logo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, slug, country ?? null, city ?? null, logoUrl ?? null]
    );
    const club = rows[0];

    let clubAdmin = null;
    if (admin?.email && admin?.password) {
      const hash = await bcrypt.hash(admin.password, 10);
      const userRes = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, 'CLUB_ADMIN') RETURNING id, email, role`,
        [club.id, admin.email, hash, admin.firstName ?? 'Club', admin.lastName ?? 'Admin']
      );
      clubAdmin = userRes.rows[0];
    }

    return { club, clubAdmin };
  });

  res.status(201).json({ ...toClub(result.club), admin: result.clubAdmin });
});

export const updateClub = asyncHandler(async (req, res) => {
  const { name, country, city, logoUrl, isActive } = req.body;
  const { rows } = await query(
    `UPDATE clubs
        SET name = COALESCE($2, name),
            country = COALESCE($3, country),
            city = COALESCE($4, city),
            logo_url = COALESCE($5, logo_url),
            is_active = COALESCE($6, is_active)
      WHERE id = $1
      RETURNING *`,
    [req.params.id, name, country, city, logoUrl, isActive]
  );
  if (!rows[0]) throw ApiError.notFound('Club not found');
  res.json(toClub(rows[0]));
});

/**
 * Delete a club (tenant) and everything associated with it.
 * ON DELETE CASCADE on tenant_id removes its teams, users, players, matches,
 * events, lineups, stats and guardians automatically. SYSTEM_ADMIN only.
 */
export const deleteClub = asyncHandler(async (req, res) => {
  const { rowCount } = await query(`DELETE FROM clubs WHERE id = $1`, [
    req.params.id,
  ]);
  if (!rowCount) throw ApiError.notFound('Club not found');
  res.status(204).send();
});

// --------------------------------------------------------------------------
// Club registration approval workflow (SYSTEM_ADMIN only).
// --------------------------------------------------------------------------

// List pending club applications awaiting review.
export const listPendingClubs = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT c.*,
            u.first_name AS applicant_first_name,
            u.last_name  AS applicant_last_name,
            u.email      AS applicant_email
       FROM clubs c
       LEFT JOIN users u ON u.tenant_id = c.id AND u.role = 'CLUB_ADMIN'
      WHERE c.status = 'PENDING'
      ORDER BY c.created_at ASC`
  );
  res.json(
    rows.map((r) => ({
      ...toClub(r),
      applicant: {
        firstName: r.applicant_first_name,
        lastName: r.applicant_last_name,
        email: r.applicant_email,
      },
    }))
  );
});

// Return the uploaded proof document for a pending club.
export const getClubProof = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT proof_document, proof_filename FROM clubs WHERE id = $1`,
    [req.params.id]
  );
  if (!rows[0]) throw ApiError.notFound('Club not found');
  res.json({
    proofDocument: rows[0].proof_document,
    proofFilename: rows[0].proof_filename,
  });
});

// Approve a pending club: mark approved + activate club and its admin(s).
export const approveClub = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE clubs
          SET status = 'APPROVED',
              is_active = TRUE,
              rejection_reason = NULL,
              reviewed_at = now(),
              reviewed_by = $2
        WHERE id = $1 AND status = 'PENDING'
        RETURNING *`,
      [req.params.id, req.user.id]
    );
    const club = rows[0];
    if (!club) return null;

    const { rows: admins } = await client.query(
      `UPDATE users SET is_active = TRUE
        WHERE tenant_id = $1 AND role = 'CLUB_ADMIN'
        RETURNING *`,
      [club.id]
    );
    return { club, admin: admins[0] };
  });

  if (!result) throw ApiError.notFound('Pending club not found');

  try {
    if (result.admin) {
      await sendApplicationApprovedEmail(
        result.admin,
        result.club.name,
        `${config.appUrl}/login`
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[approveClub] email failed:', err.message);
  }

  res.json(toClub(result.club));
});

/**
 * Email every active member of an (already approved) club to let them know
 * the club is approved and they can now log in. SYSTEM_ADMIN only.
 * Returns a per-recipient delivery summary so the send can be verified.
 */
export const notifyClubApproved = asyncHandler(async (req, res) => {
  const { rows: clubRows } = await query(`SELECT * FROM clubs WHERE id = $1`, [
    req.params.id,
  ]);
  const club = clubRows[0];
  if (!club) throw ApiError.notFound('Club not found');

  const { rows: members } = await query(
    `SELECT id, email, first_name, last_name, role
       FROM users
      WHERE tenant_id = $1 AND is_active = TRUE AND email IS NOT NULL
      ORDER BY role, first_name`,
    [club.id]
  );

  const loginLink = `${config.appUrl}/login`;
  const results = [];
  for (const member of members) {
    try {
      const info = await sendApplicationApprovedEmail(member, club.name, loginLink);
      results.push({ email: member.email, delivered: info?.delivered !== false });
    } catch (err) {
      results.push({ email: member.email, delivered: false, error: err.message });
    }
  }

  const sent = results.filter((r) => r.delivered).length;
  res.json({
    club: club.name,
    totalMembers: members.length,
    sent,
    failed: members.length - sent,
    results,
  });
});

// Reject a pending club with an optional reason.
export const rejectClub = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const { rows } = await query(
    `UPDATE clubs
        SET status = 'REJECTED',
            is_active = FALSE,
            rejection_reason = $2,
            reviewed_at = now(),
            reviewed_by = $3
      WHERE id = $1 AND status = 'PENDING'
      RETURNING *`,
    [req.params.id, reason || null, req.user.id]
  );
  const club = rows[0];
  if (!club) throw ApiError.notFound('Pending club not found');

  const { rows: admins } = await query(
    `SELECT * FROM users WHERE tenant_id = $1 AND role = 'CLUB_ADMIN' LIMIT 1`,
    [club.id]
  );

  try {
    if (admins[0]) {
      await sendApplicationRejectedEmail(admins[0], club.name, reason);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[rejectClub] email failed:', err.message);
  }

  res.json(toClub(club));
});
