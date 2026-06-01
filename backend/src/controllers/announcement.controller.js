import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { tenantFilter } from '../utils/tenantFilter.js';
import { emitToTenant } from '../realtime/socket.js';

const toAnnouncement = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  authorId: r.author_id,
  authorName:
    r.author_first_name || r.author_last_name
      ? `${r.author_first_name ?? ''} ${r.author_last_name ?? ''}`.trim()
      : 'Club',
  teamId: r.team_id,
  teamName: r.team_name, // null => whole club
  title: r.title,
  body: r.body,
  isPinned: r.is_pinned,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SELECT_FULL = `
  SELECT a.*,
         u.first_name AS author_first_name,
         u.last_name  AS author_last_name,
         t.name       AS team_name
    FROM announcements a
    LEFT JOIN users u ON u.id = a.author_id
    LEFT JOIN teams t ON t.id = a.team_id
`;

// SYSTEM_ADMIN (no tenant) sees every club's notices; others are scoped.
export const listAnnouncements = asyncHandler(async (req, res) => {
  const { clause, params } = tenantFilter(req.tenantId, 'a.tenant_id');
  const where = clause ? `WHERE ${clause}` : '';
  const { rows } = await query(
    `${SELECT_FULL}
       ${where}
       ORDER BY a.is_pinned DESC, a.created_at DESC`,
    params
  );
  res.json(rows.map(toAnnouncement));
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, isPinned, teamId } = req.body;
  // Posting a notice needs a concrete tenant; a SYSTEM_ADMIN must target one.
  if (!req.tenantId) {
    throw ApiError.badRequest(
      'Select a club (x-tenant-id) before posting an announcement'
    );
  }
  const { rows } = await query(
    `INSERT INTO announcements (tenant_id, author_id, team_id, title, body, is_pinned)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.tenantId, req.user.id, teamId ?? null, title, body, isPinned ?? false]
  );
  const { rows: full } = await query(`${SELECT_FULL} WHERE a.id = $1`, [
    rows[0].id,
  ]);
  const announcement = toAnnouncement(full[0]);
  emitToTenant(req.tenantId, 'announcement:new', announcement);
  res.status(201).json(announcement);
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, isPinned, teamId } = req.body;
  const { rows } = await query(
    `UPDATE announcements
        SET title = COALESCE($3, title),
            body = COALESCE($4, body),
            is_pinned = COALESCE($5, is_pinned),
            team_id = CASE WHEN $6 = 'CLUB' THEN NULL
                           WHEN $6 IS NULL THEN team_id
                           ELSE $6::uuid END
      WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
      RETURNING id`,
    [
      req.params.id,
      req.tenantId,
      title ?? null,
      body ?? null,
      isPinned ?? null,
      teamId === undefined ? null : teamId === null ? 'CLUB' : teamId,
    ]
  );
  if (!rows[0]) throw ApiError.notFound('Announcement not found');
  const { rows: full } = await query(`${SELECT_FULL} WHERE a.id = $1`, [
    rows[0].id,
  ]);
  const announcement = toAnnouncement(full[0]);
  emitToTenant(announcement.tenantId, 'announcement:update', announcement);
  res.json(announcement);
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `DELETE FROM announcements
      WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
      RETURNING id, tenant_id`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Announcement not found');
  emitToTenant(rows[0].tenant_id, 'announcement:delete', { id: rows[0].id });
  res.status(204).end();
});
