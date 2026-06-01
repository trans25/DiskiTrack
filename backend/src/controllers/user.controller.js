import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

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

export const deactivateUser = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE users SET is_active = FALSE
      WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('User not found');
  res.json(toUser(rows[0]));
});
