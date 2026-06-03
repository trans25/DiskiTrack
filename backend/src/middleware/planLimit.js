import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Enforce a club's subscription plan limit before creating a resource.
 *
 * Usage: router.post('/', enforcePlanLimit('teams'), createTeam)
 *
 * SYSTEM_ADMIN bypasses limits. Clubs with no subscription row are treated as
 * unlimited (fail-open) so missing data never blocks core work.
 *
 * @param {'teams'|'players'} resource
 */
export const enforcePlanLimit = (resource) =>
  asyncHandler(async (req, _res, next) => {
    if (req.user?.role === 'SYSTEM_ADMIN') return next();
    if (!req.tenantId) return next();

    const limitColumn = resource === 'teams' ? 'max_teams' : 'max_players';
    const planRes = await query(
      `SELECT p.${limitColumn} AS limit_value, p.name AS plan_name
         FROM club_subscriptions s
         JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.tenant_id = $1
        LIMIT 1`,
      [req.tenantId]
    );

    const limit = planRes.rows[0]?.limit_value;
    // NULL limit = unlimited; no subscription row = fail-open.
    if (limit === null || limit === undefined) return next();

    const countRes = await query(
      `SELECT COUNT(*)::int AS n FROM ${resource} WHERE tenant_id = $1`,
      [req.tenantId]
    );
    const current = countRes.rows[0].n;

    if (current >= limit) {
      throw new ApiError(
        402,
        `Your ${planRes.rows[0].plan_name} plan allows up to ${limit} ${resource}. ` +
          `Upgrade your plan to add more.`,
        { resource, limit, current }
      );
    }
    return next();
  });
