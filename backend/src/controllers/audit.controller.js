import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Admin: browse the audit trail for the current tenant (SYSTEM_ADMIN sees all
// when no tenant is selected). Supports a simple action/limit filter.
export const listAuditLog = asyncHandler(async (req, res) => {
  const { action, limit = 100 } = req.query;
  const params = [req.tenantId || null];
  let sql = `SELECT id, tenant_id, actor_email, actor_role, action,
                    entity_type, entity_id, summary, ip_address, created_at
               FROM audit_log
              WHERE ($1::uuid IS NULL OR tenant_id = $1)`;
  if (action) {
    params.push(action);
    sql += ` AND action = $${params.length}`;
  }
  params.push(Math.min(Number(limit) || 100, 500));
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

  const { rows } = await query(sql, params);
  res.json(rows);
});
