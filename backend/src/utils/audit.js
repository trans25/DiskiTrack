import { query } from '../db/pool.js';

/**
 * Write an entry to the immutable audit trail. Designed to never throw — audit
 * logging must not break the request it is recording. Call it fire-and-forget.
 *
 * @param {object} opts
 * @param {object} [opts.req]         Express request (to derive actor + ip)
 * @param {string} opts.action        e.g. 'PLAYER_CREATE', 'LOGIN_FAILURE'
 * @param {string} [opts.entityType]  e.g. 'player', 'team', 'club'
 * @param {string} [opts.entityId]
 * @param {string} [opts.summary]     human-readable description
 * @param {object} [opts.metadata]    structured extra detail
 * @param {string} [opts.tenantId]    override tenant (else taken from req)
 * @param {object} [opts.actor]       override actor { id, email, role }
 */
export const recordAudit = async ({
  req,
  action,
  entityType = null,
  entityId = null,
  summary = null,
  metadata = null,
  tenantId,
  actor,
}) => {
  try {
    const user = actor || req?.user || {};
    const tenant = tenantId ?? req?.tenantId ?? user.tenantId ?? null;
    const ip =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.ip ||
      null;

    await query(
      `INSERT INTO audit_log
         (tenant_id, actor_id, actor_email, actor_role, action,
          entity_type, entity_id, summary, metadata, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        tenant,
        user.id || null,
        user.email || null,
        user.role || null,
        action,
        entityType,
        entityId,
        summary,
        metadata ? JSON.stringify(metadata) : null,
        ip,
      ]
    );
  } catch (err) {
    // Never let audit logging break the actual request.
    // eslint-disable-next-line no-console
    console.error('[audit] failed to record entry:', err.message);
  }
};
