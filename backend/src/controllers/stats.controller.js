import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Aggregated dashboard counts.
 *
 * Tenant-aware: when `req.tenantId` is null (a SYSTEM_ADMIN viewing across the
 * whole platform) the counts span every club; otherwise they are scoped to the
 * caller's club. The `($1::uuid IS NULL OR tenant_id = $1)` pattern keeps a
 * single query correct for both cases.
 */
export const dashboardStats = asyncHandler(async (req, res) => {
  const t = req.tenantId; // null for cross-tenant SYSTEM_ADMIN

  const [clubs, teams, players, live, users, announcements] = await Promise.all([
    // Total clubs only matters for the platform-wide (SYSTEM_ADMIN) view.
    query(`SELECT COUNT(*)::int AS c FROM clubs`),
    query(
      `SELECT COUNT(*)::int AS c FROM teams WHERE ($1::uuid IS NULL OR tenant_id = $1)`,
      [t]
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM players WHERE ($1::uuid IS NULL OR tenant_id = $1)`,
      [t]
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM matches
        WHERE status = 'LIVE' AND ($1::uuid IS NULL OR tenant_id = $1)`,
      [t]
    ),
    // Staff users grouped by role (excludes guardians from the staff tally).
    query(
      `SELECT role, COUNT(*)::int AS c
         FROM users
        WHERE ($1::uuid IS NULL OR tenant_id = $1)
        GROUP BY role`,
      [t]
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM announcements WHERE ($1::uuid IS NULL OR tenant_id = $1)`,
      [t]
    ),
  ]);

  const byRole = users.rows.reduce((acc, r) => {
    acc[r.role] = r.c;
    return acc;
  }, {});

  const staffUsers =
    (byRole.CLUB_ADMIN || 0) + (byRole.COACH || 0) + (byRole.ANALYST || 0);

  res.json({
    scope: t ? 'club' : 'platform',
    clubs: clubs.rows[0].c,
    teams: teams.rows[0].c,
    players: players.rows[0].c,
    liveMatches: live.rows[0].c,
    announcements: announcements.rows[0].c,
    users: {
      total: staffUsers,
      clubAdmins: byRole.CLUB_ADMIN || 0,
      coaches: byRole.COACH || 0,
      analysts: byRole.ANALYST || 0,
      guardians: byRole.GUARDIAN || 0,
    },
  });
});
