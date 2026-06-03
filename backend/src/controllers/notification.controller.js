import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const toNotification = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  link: row.link,
  isRead: row.is_read,
  createdAt: row.created_at,
});

// List the current user's notifications (most recent first).
export const listNotifications = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`,
    [req.user.id]
  );
  const unread = rows.filter((r) => !r.is_read).length;
  res.json({ items: rows.map(toNotification), unread });
});

// Mark a single notification as read.
export const markRead = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE notifications SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw ApiError.notFound('Notification not found');
  res.json(toNotification(rows[0]));
});

// Mark every notification for the user as read.
export const markAllRead = asyncHandler(async (req, res) => {
  await query(
    `UPDATE notifications SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE`,
    [req.user.id]
  );
  res.json({ ok: true });
});

// Delete a notification.
export const deleteNotification = asyncHandler(async (req, res) => {
  await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [
    req.params.id,
    req.user.id,
  ]);
  res.json({ ok: true });
});
