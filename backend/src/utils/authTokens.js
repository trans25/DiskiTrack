import crypto from 'crypto';
import { query } from '../db/pool.js';

// Generate a random URL-safe token and store only its SHA-256 hash. The raw
// token is returned to the caller (to email) but never persisted.
export const createAuthToken = async (userId, purpose, ttlMs) => {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + ttlMs);

  // Invalidate any previous unused tokens of the same purpose for this user.
  await query(
    `UPDATE auth_tokens SET used_at = now()
      WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );
  await query(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, purpose, expiresAt]
  );
  return raw;
};

// Look up a valid (unused, unexpired) token row by raw token. Returns the
// joined user record or null.
export const consumeAuthToken = async (raw, purpose) => {
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const { rows } = await query(
    `SELECT t.id AS token_id, u.*
       FROM auth_tokens t
       JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = $1 AND t.purpose = $2
        AND t.used_at IS NULL AND t.expires_at > now()
      LIMIT 1`,
    [tokenHash, purpose]
  );
  return rows[0] || null;
};

export const markTokenUsed = (tokenId) =>
  query(`UPDATE auth_tokens SET used_at = now() WHERE id = $1`, [tokenId]);
