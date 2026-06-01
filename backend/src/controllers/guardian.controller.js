import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Resolve the guardian profile row for the logged-in guardian user. */
const getGuardianForUser = async (userId, tenantId) => {
  const { rows } = await query(
    `SELECT * FROM guardians WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId]
  );
  return rows[0] ?? null;
};

// CLUB_ADMIN — link players to a guardian account.
export const assignPlayers = asyncHandler(async (req, res) => {
  const { guardianId } = req.params;
  const { playerIds } = req.body;

  const values = playerIds
    .map((_, i) => `($1, $2, $${i + 3})`)
    .join(', ');
  await query(
    `INSERT INTO guardian_players (tenant_id, guardian_id, player_id)
     VALUES ${values}
     ON CONFLICT (guardian_id, player_id) DO NOTHING`,
    [req.tenantId, guardianId, ...playerIds]
  );
  res.status(201).json({ guardianId, assigned: playerIds.length });
});

// GUARDIAN portal — only the players linked to this guardian.
export const myPlayers = asyncHandler(async (req, res) => {
  const guardian = await getGuardianForUser(req.user.id, req.tenantId);
  if (!guardian) throw ApiError.notFound('Guardian profile not found');

  const { rows } = await query(
    `SELECT p.*, t.name AS team_name
       FROM guardian_players gp
       JOIN players p ON p.id = gp.player_id
       LEFT JOIN teams t ON t.id = p.team_id
      WHERE gp.guardian_id = $1 AND gp.tenant_id = $2
      ORDER BY p.last_name`,
    [guardian.id, req.tenantId]
  );
  res.json(rows);
});

// GUARDIAN portal — match history for one of their assigned players only.
export const myPlayerMatches = asyncHandler(async (req, res) => {
  const guardian = await getGuardianForUser(req.user.id, req.tenantId);
  if (!guardian) throw ApiError.notFound('Guardian profile not found');

  // Authorization: ensure the requested player belongs to this guardian.
  const link = await query(
    `SELECT 1 FROM guardian_players
      WHERE guardian_id = $1 AND player_id = $2 AND tenant_id = $3`,
    [guardian.id, req.params.playerId, req.tenantId]
  );
  if (!link.rows[0]) throw ApiError.forbidden('Player not assigned to you');

  const { rows } = await query(
    `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name,
            s.goals, s.assists, s.shots, s.fouls, s.yellow_cards, s.red_cards
       FROM player_stats s
       JOIN matches m ON m.id = s.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
      WHERE s.player_id = $1 AND s.tenant_id = $2
      ORDER BY m.scheduled_at DESC`,
    [req.params.playerId, req.tenantId]
  );
  res.json(rows);
});
