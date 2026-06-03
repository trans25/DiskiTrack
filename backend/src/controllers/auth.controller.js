import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import {
  createAuthToken,
  consumeAuthToken,
  markTokenUsed,
} from '../utils/authTokens.js';
import {
  sendPasswordResetEmail,
  sendApplicationReceivedEmail,
  sendNewApplicationAdminEmail,
} from '../utils/mailer.js';
import { config } from '../config/index.js';
import { recordAudit } from '../utils/audit.js';

const toPublicUser = (row) => ({
  id: row.id,
  tenantId: row.tenant_id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  role: row.role,
});

const issueTokens = (user) => {
  const payload = {
    sub: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    email: user.email,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Look the user up regardless of active state so we can return a clear,
  // friendly message when their club is still pending or was rejected.
  const { rows } = await query(
    `SELECT u.*, c.status AS club_status, c.rejection_reason AS club_rejection_reason
       FROM users u
       LEFT JOIN clubs c ON c.id = u.tenant_id
      WHERE u.email = $1
      LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  // Account lockout: block sign-in while a temporary lock is active.
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const mins = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60000
    );
    throw ApiError.forbidden(
      `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`
    );
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    // Increment the failure counter; lock the account after 5 attempts.
    const attempts = (user.failed_login_attempts || 0) + 1;
    const LOCK_THRESHOLD = 5;
    const lockFor = attempts >= LOCK_THRESHOLD ? "now() + interval '15 minutes'" : 'NULL';
    await query(
      `UPDATE users
          SET failed_login_attempts = $2,
              locked_until = ${lockFor}
        WHERE id = $1`,
      [user.id, attempts >= LOCK_THRESHOLD ? 0 : attempts]
    );
    recordAudit({
      action: 'LOGIN_FAILURE',
      entityType: 'user',
      entityId: user.id,
      summary: `Failed login for ${user.email}`,
      tenantId: user.tenant_id,
      req,
    });
    throw ApiError.unauthorized('Invalid credentials');
  }

  // Gate sign-in on the club approval workflow.
  if (user.club_status === 'PENDING') {
    throw ApiError.forbidden(
      'Your club registration is still pending review. We\'ll email you as soon as it\'s approved.'
    );
  }
  if (user.club_status === 'REJECTED') {
    throw ApiError.forbidden(
      user.club_rejection_reason
        ? `Your club registration was not approved: ${user.club_rejection_reason}`
        : 'Your club registration was not approved. Please contact support.'
    );
  }
  if (!user.is_active) {
    throw ApiError.unauthorized('Your account is not active. Please contact your club admin.');
  }

  await query(`UPDATE users SET last_login_at = now(), failed_login_attempts = 0, locked_until = NULL WHERE id = $1`, [user.id]);

  recordAudit({
    action: 'LOGIN_SUCCESS',
    entityType: 'user',
    entityId: user.id,
    summary: `${user.email} signed in`,
    tenantId: user.tenant_id,
    actor: { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
    req,
  });

  const tokens = issueTokens(user);
  return res.json({ user: toPublicUser(user), ...tokens });
});

// Guardian quick sign-in by child's ID number.
// number of one of their registered children; we validate it against the club
// database. If a matching player with a linked guardian account exists, we log
// that guardian in. Otherwise we return a clear "player not found" error.
export const guardianIdLogin = asyncHandler(async (req, res) => {
  const { idNumber } = req.body;
  const id = idNumber.trim();

  // Find the player by ID number (ID numbers are nationally unique).
  const playerRes = await query(
    `SELECT p.id AS player_id, p.tenant_id, c.status AS club_status
       FROM players p
       JOIN clubs c ON c.id = p.tenant_id
      WHERE p.id_number = $1
      LIMIT 1`,
    [id]
  );
  const player = playerRes.rows[0];
  if (!player) {
    throw ApiError.notFound(
      "We couldn't find a player with that ID number. Please check it and try again."
    );
  }
  if (player.club_status && player.club_status !== 'APPROVED') {
    throw ApiError.forbidden("This player's club is not active yet. Please contact the club.");
  }

  // Find the guardian linked to this player.
  const guardianRes = await query(
    `SELECT u.*
       FROM guardian_players gp
       JOIN guardians g ON g.id = gp.guardian_id
       JOIN users u ON u.id = g.user_id
      WHERE gp.player_id = $1
      LIMIT 1`,
    [player.player_id]
  );
  const user = guardianRes.rows[0];
  if (!user) {
    throw ApiError.notFound(
      'No guardian is linked to this player yet. Please ask the club to add you as a guardian.'
    );
  }

  // Activate the guardian account on first ID sign-in (no password needed).
  if (!user.is_active) {
    await query(`UPDATE users SET is_active = TRUE WHERE id = $1`, [user.id]);
    user.is_active = true;
  }

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);

  const tokens = issueTokens(user);
  return res.json({ user: toPublicUser(user), ...tokens });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const { rows } = await query(
    `SELECT * FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [payload.sub]
  );
  const user = rows[0];
  if (!user) throw ApiError.unauthorized('User no longer exists');

  return res.json(issueTokens(user));
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [
    req.user.id,
  ]);
  if (!rows[0]) throw ApiError.notFound('User not found');
  return res.json({ user: toPublicUser(rows[0]) });
});

// --------------------------------------------------------------------------
// Public club self-registration. Creates a new club tenant plus its first
// CLUB_ADMIN in one transaction, then logs the admin straight in.
// --------------------------------------------------------------------------
const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);

export const registerClub = asyncHandler(async (req, res) => {
  const {
    clubName,
    country,
    city,
    firstName,
    lastName,
    email,
    password,
    proofDocument, // base64 data URI of the uploaded proof
    proofFilename,
  } = req.body;

  if (!proofDocument) {
    throw ApiError.badRequest(
      'A proof document showing you represent this club is required.'
    );
  }

  const existing = await query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [
    email,
  ]);
  if (existing.rows[0]) {
    throw ApiError.conflict('An account with this email already exists');
  }

  // Build a unique slug from the club name.
  let slug = slugify(clubName) || 'club';
  const { rows: slugTaken } = await query(
    `SELECT 1 FROM clubs WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  if (slugTaken[0]) slug = `${slug}-${Date.now().toString(36)}`;

  const hash = await bcrypt.hash(password, 10);

  // Create the club as PENDING and the admin as INACTIVE. The applicant cannot
  // sign in until a SYSTEM_ADMIN approves the registration.
  const user = await withTransaction(async (client) => {
    const { rows: clubRows } = await client.query(
      `INSERT INTO clubs (name, slug, country, city, status, proof_document, proof_filename, contact_email, is_active)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, FALSE) RETURNING *`,
      [
        clubName,
        slug,
        country || null,
        city || null,
        proofDocument,
        proofFilename || null,
        email,
      ]
    );
    const club = clubRows[0];
    const { rows: userRows } = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'CLUB_ADMIN', FALSE) RETURNING *`,
      [club.id, email, hash, firstName, lastName]
    );
    return userRows[0];
  });

  // Notify the applicant and the system admins (best-effort; never block signup).
  try {
    await sendApplicationReceivedEmail(user, clubName);
    const { rows: admins } = await query(
      `SELECT email FROM users WHERE role = 'SYSTEM_ADMIN' AND is_active = TRUE`
    );
    const reviewLink = `${config.appUrl}/admin/applications`;
    await Promise.all(
      admins.map((a) =>
        sendNewApplicationAdminEmail(
          a.email,
          clubName,
          `${firstName} ${lastName}`,
          reviewLink
        )
      )
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[registerClub] notification email failed:', err.message);
  }

  return res.status(201).json({
    status: 'PENDING',
    message:
      'Your registration has been submitted. We\'ll review your proof of representation and email you once your club is approved.',
  });
});

// --------------------------------------------------------------------------
// Forgot password — always returns 200 so we never reveal whether an email is
// registered. When the email exists we email a single-use reset link.
// --------------------------------------------------------------------------
const ONE_HOUR = 60 * 60 * 1000;

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (user) {
    const raw = await createAuthToken(user.id, 'RESET', ONE_HOUR);
    const link = `${config.appUrl}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user, link);
  }
  return res.json({
    message:
      'If an account exists for that email, a password reset link has been sent.',
  });
});

// Reset password (used by both RESET and INVITE flows). The token determines
// which purpose; INVITE also activates the account.
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password, purpose = 'RESET' } = req.body;
  const record = await consumeAuthToken(token, purpose);
  if (!record) {
    throw ApiError.badRequest('This link is invalid or has expired');
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    `UPDATE users SET password_hash = $1, is_active = TRUE WHERE id = $2`,
    [hash, record.id]
  );
  await markTokenUsed(record.token_id);

  // Log the user straight in for a smooth experience.
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [record.id]);
  const user = rows[0];
  const tokens = issueTokens(user);
  return res.json({ user: toPublicUser(user), ...tokens });
});

// Validate an invite/reset token without consuming it, so the frontend can
// show the user's name and confirm the link is still good before they type.
export const verifyToken = asyncHandler(async (req, res) => {
  const { token, purpose = 'RESET' } = req.query;
  const record = await consumeAuthToken(token, purpose);
  if (!record) {
    throw ApiError.badRequest('This link is invalid or has expired');
  }
  return res.json({
    email: record.email,
    firstName: record.first_name,
    role: record.role,
  });
});
