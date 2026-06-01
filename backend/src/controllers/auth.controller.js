import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';

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

  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
    [email]
  );
  const user = rows[0];
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

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
