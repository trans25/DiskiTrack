import { query } from '../db/pool.js';
import { emitToUser } from '../realtime/socket.js';

/**
 * Create an in-app notification for a single user and push it live over the
 * socket. Fire-and-forget safe: never throws into the caller.
 *
 * @param {object} opts
 * @param {string} opts.userId
 * @param {string} [opts.tenantId]
 * @param {string} [opts.type]   INFO | SUCCESS | WARNING | MESSAGE | CALLUP | BILLING | SYSTEM
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {string} [opts.link]
 */
export const notifyUser = async ({
  userId,
  tenantId = null,
  type = 'INFO',
  title,
  body = null,
  link = null,
}) => {
  try {
    if (!userId || !title) return null;
    const { rows } = await query(
      `INSERT INTO notifications (tenant_id, user_id, type, title, body, link)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [tenantId, userId, type, title, body, link]
    );
    const notification = rows[0];
    emitToUser(userId, 'notification:new', notification);
    return notification;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] failed:', err.message);
    return null;
  }
};

/**
 * Notify every active user in a tenant (optionally filtered by roles).
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string[]} [opts.roles]
 */
export const notifyTenant = async ({ tenantId, roles, ...rest }) => {
  try {
    if (!tenantId) return;
    const params = [tenantId];
    let sql = `SELECT id FROM users WHERE tenant_id = $1 AND is_active = TRUE`;
    if (roles && roles.length) {
      params.push(roles);
      sql += ` AND role = ANY($2)`;
    }
    const { rows } = await query(sql, params);
    await Promise.all(
      rows.map((u) => notifyUser({ userId: u.id, tenantId, ...rest }))
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notify] tenant fan-out failed:', err.message);
  }
};
