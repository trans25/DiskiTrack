import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Top scorers across the tenant (or a specific team).
export const topScorers = asyncHandler(async (req, res) => {
  const { teamId, limit = 10 } = req.query;
  const params = [req.tenantId];
  let teamFilter = '';
  if (teamId) {
    params.push(teamId);
    teamFilter = ` AND p.team_id = $${params.length}`;
  }
  params.push(Number(limit));

  const { rows } = await query(
    `SELECT p.id, p.first_name, p.last_name, p.team_id,
            COALESCE(SUM(s.goals), 0)   AS goals,
            COALESCE(SUM(s.assists), 0) AS assists
       FROM players p
       LEFT JOIN player_stats s ON s.player_id = p.id
      WHERE ($1::uuid IS NULL OR p.tenant_id = $1)${teamFilter}
      GROUP BY p.id
      ORDER BY goals DESC, assists DESC
      LIMIT $${params.length}`,
    params
  );
  res.json(rows);
});

// Aggregated performance for one team across all matches.
export const teamPerformance = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { rows } = await query(
    `SELECT
        COUNT(*) FILTER (WHERE status = 'FINISHED') AS matches_played,
        COUNT(*) FILTER (
          WHERE status = 'FINISHED' AND (
            (home_team_id = $2 AND home_score > away_score) OR
            (away_team_id = $2 AND away_score > home_score))) AS wins,
        COUNT(*) FILTER (
          WHERE status = 'FINISHED' AND home_score = away_score) AS draws,
        COUNT(*) FILTER (
          WHERE status = 'FINISHED' AND (
            (home_team_id = $2 AND home_score < away_score) OR
            (away_team_id = $2 AND away_score < home_score))) AS losses,
        COALESCE(SUM(CASE WHEN home_team_id = $2 THEN home_score
                          WHEN away_team_id = $2 THEN away_score END), 0) AS goals_for,
        COALESCE(SUM(CASE WHEN home_team_id = $2 THEN away_score
                          WHEN away_team_id = $2 THEN home_score END), 0) AS goals_against
       FROM matches
      WHERE tenant_id = $1 AND (home_team_id = $2 OR away_team_id = $2)`,
    [req.tenantId, teamId]
  );
  res.json(rows[0]);
});

// Full event + stat report for a single match.
export const matchReport = asyncHandler(async (req, res) => {
  const { matchId } = req.params;

  const [{ rows: matchRows }, { rows: eventRows }, { rows: statRows }] =
    await Promise.all([
      query(
        `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name
           FROM matches m
           JOIN teams ht ON ht.id = m.home_team_id
           JOIN teams at ON at.id = m.away_team_id
          WHERE m.id = $1 AND m.tenant_id = $2`,
        [matchId, req.tenantId]
      ),
      query(
        `SELECT e.*, (p.first_name || ' ' || p.last_name) AS player_name
           FROM match_events e
           LEFT JOIN players p ON p.id = e.player_id
          WHERE e.match_id = $1 AND e.tenant_id = $2
          ORDER BY e.minute NULLS LAST, e.created_at`,
        [matchId, req.tenantId]
      ),
      query(
        `SELECT s.*, (p.first_name || ' ' || p.last_name) AS player_name
           FROM player_stats s
           JOIN players p ON p.id = s.player_id
          WHERE s.match_id = $1 AND s.tenant_id = $2`,
        [matchId, req.tenantId]
      ),
    ]);

  res.json({
    match: matchRows[0] ?? null,
    events: eventRows,
    playerStats: statRows,
  });
});
