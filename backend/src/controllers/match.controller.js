import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToMatch } from '../realtime/socket.js';

const toMatch = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  homeTeamId: r.home_team_id,
  awayTeamId: r.away_team_id,
  homeTeamName: r.home_team_name,
  awayTeamName: r.away_team_name,
  venue: r.venue,
  scheduledAt: r.scheduled_at,
  status: r.status,
  homeScore: r.home_score,
  awayScore: r.away_score,
  kickoffAt: r.kickoff_at,
  finishedAt: r.finished_at,
});

const SELECT_WITH_TEAMS = `
  SELECT m.*,
         ht.name AS home_team_name,
         at.name AS away_team_name
    FROM matches m
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
`;

export const listMatches = asyncHandler(async (req, res) => {
  const { status } = req.query;
  // SYSTEM_ADMIN (null tenant) sees matches across all clubs.
  const params = [req.tenantId];
  let sql = `${SELECT_WITH_TEAMS} WHERE ($1::uuid IS NULL OR m.tenant_id = $1)`;
  if (status) {
    params.push(status);
    sql += ` AND m.status = $${params.length}`;
  }
  sql += ` ORDER BY m.scheduled_at DESC`;
  const { rows } = await query(sql, params);
  res.json(rows.map(toMatch));
});

export const getMatch = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${SELECT_WITH_TEAMS} WHERE m.id = $1 AND ($2::uuid IS NULL OR m.tenant_id = $2)`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Match not found');
  res.json(toMatch(rows[0]));
});

export const createMatch = asyncHandler(async (req, res) => {
  const { homeTeamId, awayTeamId, venue, scheduledAt } = req.body;
  if (homeTeamId === awayTeamId) {
    throw ApiError.badRequest('Home and away teams must differ');
  }
  const { rows } = await query(
    `INSERT INTO matches (tenant_id, home_team_id, away_team_id, venue, scheduled_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [req.tenantId, homeTeamId, awayTeamId, venue ?? null, scheduledAt]
  );
  const { rows: full } = await query(
    `${SELECT_WITH_TEAMS} WHERE m.id = $1`,
    [rows[0].id]
  );
  res.status(201).json(toMatch(full[0]));
});

// Transition match status; LIVE sets kickoff, FINISHED stamps finished_at.
export const updateMatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await query(
    `UPDATE matches
        SET status = $3,
            kickoff_at = CASE WHEN $3 = 'LIVE'   AND kickoff_at IS NULL THEN now() ELSE kickoff_at END,
            finished_at = CASE WHEN $3 = 'FINISHED' THEN now() ELSE finished_at END
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [req.params.id, req.tenantId, status]
  );
  if (!rows[0]) throw ApiError.notFound('Match not found');

  // Push the status change to everyone watching this match.
  emitToMatch(rows[0].id, 'match:status', {
    matchId: rows[0].id,
    status: rows[0].status,
  });

  res.json(toMatch(rows[0]));
});

// Edit fixture details (reschedule, venue) and/or record the final score.
export const updateMatch = asyncHandler(async (req, res) => {
  const { venue, scheduledAt, homeScore, awayScore } = req.body;
  const { rows } = await query(
    `UPDATE matches
        SET venue = COALESCE($3, venue),
            scheduled_at = COALESCE($4, scheduled_at),
            home_score = COALESCE($5, home_score),
            away_score = COALESCE($6, away_score)
      WHERE id = $1 AND tenant_id = $2
      RETURNING id`,
    [
      req.params.id,
      req.tenantId,
      venue ?? null,
      scheduledAt ?? null,
      homeScore ?? null,
      awayScore ?? null,
    ]
  );
  if (!rows[0]) throw ApiError.notFound('Match not found');
  const { rows: full } = await query(`${SELECT_WITH_TEAMS} WHERE m.id = $1`, [
    rows[0].id,
  ]);
  res.json(toMatch(full[0]));
});

export const deleteMatch = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    `DELETE FROM matches WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, req.tenantId]
  );
  if (!rowCount) throw ApiError.notFound('Match not found');
  res.status(204).send();
});
