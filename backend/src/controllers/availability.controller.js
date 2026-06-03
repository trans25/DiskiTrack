import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'MAYBE'];

const toRow = (r) => ({
  playerId: r.player_id,
  firstName: r.first_name,
  lastName: r.last_name,
  jerseyNumber: r.jersey_number,
  position: r.position,
  status: r.status ?? null,
  note: r.note ?? null,
  respondedAt: r.responded_at ?? null,
});

// Ensure the fixture belongs to the caller's club.
const loadMatch = async (matchId, tenantId) => {
  const { rows } = await query(
    `SELECT id, home_team_id, away_team_id, status FROM matches
      WHERE id = $1 AND tenant_id = $2`,
    [matchId, tenantId]
  );
  return rows[0] ?? null;
};

// COACH / CLUB_ADMIN — every squad player's availability for a fixture, so the
// coach can see who is in, out or unsure before naming the call-up.
export const getMatchAvailability = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const match = await loadMatch(matchId, req.tenantId);
  if (!match) throw ApiError.notFound('Match not found');

  // Every player in either side's team, left-joined to their RSVP (if any).
  const { rows } = await query(
    `SELECT p.id AS player_id, p.first_name, p.last_name,
            p.jersey_number, p.position,
            ma.status, ma.note, ma.updated_at AS responded_at
       FROM players p
       LEFT JOIN match_availability ma
              ON ma.player_id = p.id AND ma.match_id = $1
      WHERE p.tenant_id = $2
        AND p.is_active = TRUE
        AND p.team_id IN ($3, $4)
      ORDER BY p.jersey_number NULLS LAST, p.last_name`,
    [matchId, req.tenantId, match.home_team_id, match.away_team_id]
  );

  const players = rows.map(toRow);
  const summary = players.reduce(
    (acc, p) => {
      if (p.status === 'AVAILABLE') acc.available += 1;
      else if (p.status === 'UNAVAILABLE') acc.unavailable += 1;
      else if (p.status === 'MAYBE') acc.maybe += 1;
      else acc.pending += 1;
      return acc;
    },
    { available: 0, unavailable: 0, maybe: 0, pending: 0 }
  );

  res.json({ matchId, summary, players });
});

// Resolve the set of player ids the logged-in user is allowed to respond for.
const resolveAllowedPlayerIds = async (req) => {
  if (req.user.role === 'PLAYER') {
    const { rows } = await query(
      `SELECT id FROM players WHERE user_id = $1 AND tenant_id = $2`,
      [req.user.id, req.tenantId]
    );
    return rows.map((r) => r.id);
  }
  if (req.user.role === 'GUARDIAN') {
    const { rows } = await query(
      `SELECT gp.player_id AS id
         FROM guardian_players gp
         JOIN guardians g ON g.id = gp.guardian_id
        WHERE g.user_id = $1 AND gp.tenant_id = $2`,
      [req.user.id, req.tenantId]
    );
    return rows.map((r) => r.id);
  }
  return [];
};

// PLAYER / GUARDIAN — submit (or update) availability for a fixture.
export const setPlayerAvailability = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { playerId, status, note } = req.body;

  if (!STATUSES.includes(status)) {
    throw ApiError.badRequest('status must be AVAILABLE, UNAVAILABLE or MAYBE');
  }

  const match = await loadMatch(matchId, req.tenantId);
  if (!match) throw ApiError.notFound('Match not found');
  if (match.status === 'FINISHED') {
    throw ApiError.badRequest('This fixture has already been played');
  }

  const allowed = await resolveAllowedPlayerIds(req);
  if (!allowed.includes(playerId)) {
    throw ApiError.forbidden('You can only set availability for your own player');
  }

  const { rows } = await query(
    `INSERT INTO match_availability
       (tenant_id, match_id, player_id, status, note, responded_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (match_id, player_id)
     DO UPDATE SET status = EXCLUDED.status,
                   note = EXCLUDED.note,
                   responded_by = EXCLUDED.responded_by
     RETURNING player_id, status, note, updated_at AS responded_at`,
    [req.tenantId, matchId, playerId, status, note ?? null, req.user.id]
  );

  res.status(201).json({
    matchId,
    playerId: rows[0].player_id,
    status: rows[0].status,
    note: rows[0].note,
    respondedAt: rows[0].responded_at,
  });
});

// PLAYER / GUARDIAN — list their own availability responses for upcoming
// fixtures, so the portal can show what still needs a reply.
export const getMyAvailability = asyncHandler(async (req, res) => {
  const allowed = await resolveAllowedPlayerIds(req);
  if (allowed.length === 0) return res.json([]);

  const { rows } = await query(
    `SELECT m.id AS match_id, m.scheduled_at, m.status AS match_status,
            ht.name AS home_team_name, at.name AS away_team_name,
            ma.player_id, ma.status, ma.note
       FROM matches m
       JOIN players p ON p.team_id IN (m.home_team_id, m.away_team_id)
       LEFT JOIN match_availability ma
              ON ma.match_id = m.id AND ma.player_id = p.id
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
      WHERE p.id = ANY($1)
        AND m.tenant_id = $2
        AND m.status <> 'FINISHED'
      ORDER BY m.scheduled_at ASC`,
    [allowed, req.tenantId]
  );

  res.json(
    rows.map((r) => ({
      matchId: r.match_id,
      playerId: r.player_id,
      scheduledAt: r.scheduled_at,
      matchStatus: r.match_status,
      homeTeamName: r.home_team_name,
      awayTeamName: r.away_team_name,
      status: r.status ?? null,
      note: r.note ?? null,
    }))
  );
});
