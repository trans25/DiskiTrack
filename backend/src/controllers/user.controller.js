import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAuthToken } from '../utils/authTokens.js';
import { sendInviteEmail } from '../utils/mailer.js';
import { config } from '../config/index.js';

const toUser = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  email: r.email,
  firstName: r.first_name,
  lastName: r.last_name,
  role: r.role,
  isActive: r.is_active,
});

// CLUB_ADMIN / SYSTEM_ADMIN — list users. SYSTEM_ADMIN (null tenant) sees
// users across all clubs; CLUB_ADMIN sees only their own club's users.
export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const params = [req.tenantId];
  let sql = `SELECT * FROM users WHERE ($1::uuid IS NULL OR tenant_id = $1)`;
  if (role) {
    params.push(role);
    sql += ` AND role = $${params.length}`;
  }
  sql += ` ORDER BY role, created_at DESC`;
  const { rows } = await query(sql, params);
  res.json(rows.map(toUser));
});

// Create a tenant-scoped user (coach / analyst / guardian / club_admin).
export const createUser = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  if (!req.tenantId) throw ApiError.badRequest('A tenant context is required');

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.tenantId, email, hash, firstName, lastName, role]
  );

  // A GUARDIAN user gets a matching guardian profile row.
  if (role === 'GUARDIAN') {
    await query(
      `INSERT INTO guardians (tenant_id, user_id) VALUES ($1, $2)`,
      [req.tenantId, rows[0].id]
    );
  }

  res.status(201).json(toUser(rows[0]));
});

// Invite a member into the caller's club. Creates an INACTIVE user with a
// random placeholder password, then emails a single-use link so the member can
// set their own password and activate the account.
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const inviteUser = asyncHandler(async (req, res) => {
  const { email, firstName, lastName, role } = req.body;
  if (!req.tenantId) throw ApiError.badRequest('A tenant context is required');

  const existing = await query(`SELECT 1 FROM users WHERE email = $1 LIMIT 1`, [
    email,
  ]);
  if (existing.rows[0]) {
    throw ApiError.conflict('A user with this email already exists');
  }

  // Random placeholder hash; the real password is set via the invite link.
  const placeholder = crypto.randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(placeholder, 10);

  const { rows } = await query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE) RETURNING *`,
    [req.tenantId, email, hash, firstName, lastName, role]
  );
  const user = rows[0];

  if (role === 'GUARDIAN') {
    await query(`INSERT INTO guardians (tenant_id, user_id) VALUES ($1, $2)`, [
      req.tenantId,
      user.id,
    ]);
  }

  const { rows: clubRows } = await query(`SELECT name FROM clubs WHERE id = $1`, [
    req.tenantId,
  ]);
  const clubName = clubRows[0]?.name || 'your club';
  const inviterName = req.user
    ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
    : '';

  const raw = await createAuthToken(user.id, 'INVITE', SEVEN_DAYS);
  const link = `${config.appUrl}/accept-invite?token=${raw}`;
  const { delivered } = await sendInviteEmail(user, link, inviterName, clubName);

  res.status(201).json({
    ...toUser(user),
    invited: true,
    emailDelivered: delivered,
    // In dev (no SMTP) expose the link so the admin can share it manually.
    inviteLink: delivered ? undefined : link,
  });
});

// Re-send an invite to a member who hasn't activated yet.
export const resendInvite = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [req.params.id, req.tenantId]
  );
  const user = rows[0];
  if (!user) throw ApiError.notFound('User not found');

  const { rows: clubRows } = await query(`SELECT name FROM clubs WHERE id = $1`, [
    req.tenantId,
  ]);
  const clubName = clubRows[0]?.name || 'your club';

  const raw = await createAuthToken(user.id, 'INVITE', SEVEN_DAYS);
  const link = `${config.appUrl}/accept-invite?token=${raw}`;
  const { delivered } = await sendInviteEmail(user, link, '', clubName);

  res.json({ emailDelivered: delivered, inviteLink: delivered ? undefined : link });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE users SET is_active = FALSE
      WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  res.json(toUser(rows[0]));
});
