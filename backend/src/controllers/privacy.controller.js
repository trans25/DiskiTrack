import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from '../utils/audit.js';
import { notifyTenant } from '../utils/notify.js';

// Record a consent decision for the current user (POPIA/GDPR).
export const recordConsent = asyncHandler(async (req, res) => {
  const { consentType, granted = true, version = '1.0' } = req.body;
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

  const { rows } = await query(
    `INSERT INTO consent_records
        (tenant_id, user_id, subject_type, subject_id, consent_type, granted, version, ip_address)
     VALUES ($1,$2,'USER',$2,$3,$4,$5,$6)
     RETURNING *`,
    [req.tenantId || null, req.user.id, consentType, granted, version, ip]
  );

  recordAudit({
    req,
    action: 'CONSENT_RECORDED',
    entityType: 'consent',
    entityId: rows[0].id,
    summary: `Consent ${granted ? 'granted' : 'withdrawn'}: ${consentType}`,
  });

  res.status(201).json({ id: rows[0].id, createdAt: rows[0].created_at });
});

// List the current user's consent history.
export const listMyConsent = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT consent_type, granted, version, created_at
       FROM consent_records WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// POPIA/GDPR: export everything we hold about the requesting user.
export const exportMyData = asyncHandler(async (req, res) => {
  const userRes = await query(
    `SELECT id, tenant_id, email, first_name, last_name, role, is_active,
            last_login_at, created_at
       FROM users WHERE id = $1`,
    [req.user.id]
  );
  if (!userRes.rows[0]) throw ApiError.notFound('User not found');

  const consent = await query(
    `SELECT consent_type, granted, version, created_at
       FROM consent_records WHERE user_id = $1`,
    [req.user.id]
  );
  const notifications = await query(
    `SELECT type, title, body, is_read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.user.id]
  );
  const audit = await query(
    `SELECT action, entity_type, summary, created_at
       FROM audit_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [req.user.id]
  );

  // If this user is a linked player, include their player record.
  const player = await query(
    `SELECT first_name, last_name, dob, id_number, email, position, jersey_number, created_at
       FROM players WHERE user_id = $1`,
    [req.user.id]
  );

  recordAudit({
    req,
    action: 'DATA_EXPORT',
    entityType: 'user',
    entityId: req.user.id,
    summary: 'User exported their personal data',
  });

  res.setHeader(
    'Content-Disposition',
    'attachment; filename="diskitrack-my-data.json"'
  );
  res.json({
    exportedAt: new Date().toISOString(),
    account: userRes.rows[0],
    playerProfile: player.rows[0] || null,
    consent: consent.rows,
    notifications: notifications.rows,
    activity: audit.rows,
  });
});

// POPIA/GDPR: raise a data export or deletion ("right to be forgotten") request
// for an admin to action.
export const createDataRequest = asyncHandler(async (req, res) => {
  const { requestType, notes } = req.body;
  if (!['EXPORT', 'DELETE'].includes(requestType)) {
    throw ApiError.badRequest('requestType must be EXPORT or DELETE');
  }
  const { rows } = await query(
    `INSERT INTO data_requests (tenant_id, user_id, request_type, notes)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.tenantId || null, req.user.id, requestType, notes || null]
  );

  recordAudit({
    req,
    action: 'DATA_REQUEST_CREATED',
    entityType: 'data_request',
    entityId: rows[0].id,
    summary: `${requestType} request raised`,
  });

  notifyTenant({
    tenantId: req.tenantId,
    roles: ['CLUB_ADMIN'],
    type: 'WARNING',
    title: 'New data request',
    body: `A ${requestType.toLowerCase()} request was submitted and needs review.`,
    link: '/privacy',
  });

  res.status(201).json({ id: rows[0].id, status: rows[0].status });
});

// List the current user's own data requests.
export const listMyDataRequests = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, request_type, status, notes, created_at, resolved_at
       FROM data_requests WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Admin: list all data requests in the tenant.
export const listDataRequests = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT d.id, d.request_type, d.status, d.notes, d.created_at, d.resolved_at,
            u.email, u.first_name, u.last_name
       FROM data_requests d
       JOIN users u ON u.id = d.user_id
      WHERE ($1::uuid IS NULL OR d.tenant_id = $1)
      ORDER BY d.created_at DESC`,
    [req.tenantId || null]
  );
  res.json(rows);
});

// Admin: resolve a data request.
export const resolveDataRequest = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  if (!['COMPLETED', 'REJECTED'].includes(status)) {
    throw ApiError.badRequest('status must be COMPLETED or REJECTED');
  }
  const { rows } = await query(
    `UPDATE data_requests
        SET status = $2, notes = COALESCE($3, notes), resolved_at = now(), resolved_by = $4
      WHERE id = $1 AND ($5::uuid IS NULL OR tenant_id = $5)
      RETURNING *`,
    [req.params.id, status, notes || null, req.user.id, req.tenantId || null]
  );
  if (!rows[0]) throw ApiError.notFound('Request not found');

  recordAudit({
    req,
    action: 'DATA_REQUEST_RESOLVED',
    entityType: 'data_request',
    entityId: rows[0].id,
    summary: `Data request ${status.toLowerCase()}`,
  });

  notifyTenant({
    tenantId: rows[0].tenant_id,
    roles: undefined,
    type: 'INFO',
    title: 'Data request updated',
    body: `Your data request was ${status.toLowerCase()}.`,
    link: '/privacy',
  });

  res.json({ id: rows[0].id, status: rows[0].status });
});
