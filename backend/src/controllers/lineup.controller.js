import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const toLineupRow = (r) => ({
  id: r.id,
  matchId: r.match_id,
  teamId: r.team_id,
  playerId: r.player_id,
  isStarting: r.is_starting,
  jerseyNumber: r.jersey_number,
  position: r.position,
  playerName: `${r.first_name} ${r.last_name}`,
  firstName: r.first_name,
  lastName: r.last_name,
});

const SELECT_LINEUP = `
  SELECT l.*, p.first_name, p.last_name
    FROM match_lineups l
    JOIN players p ON p.id = l.player_id
`;

// Return the saved lineup (starters + subs) and chosen formations for a match.
export const getMatchLineup = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const m = await query(
    `SELECT home_formation, away_formation,
            home_team_id, away_team_id
       FROM matches
      WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)`,
    [matchId, req.tenantId]
  );
  if (!m.rows[0]) throw ApiError.notFound('Match not found');

  const { rows } = await query(
    `${SELECT_LINEUP}
      WHERE l.match_id = $1 AND ($2::uuid IS NULL OR l.tenant_id = $2)
      ORDER BY l.is_starting DESC, l.jersey_number NULLS LAST`,
    [matchId, req.tenantId]
  );

  res.json({
    homeFormation: m.rows[0].home_formation,
    awayFormation: m.rows[0].away_formation,
    homeTeamId: m.rows[0].home_team_id,
    awayTeamId: m.rows[0].away_team_id,
    lineup: rows.map(toLineupRow),
  });
});

/**
 * Save the lineup for ONE team (the internal side being set up).
 * Replaces that team's existing lineup rows in a single transaction and
 * records the chosen formation against the correct side of the match.
 */
export const saveMatchLineup = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { teamId, formation, players } = req.body;

  const result = await withTransaction(async (client) => {
    const m = await client.query(
      `SELECT home_team_id, away_team_id FROM matches
        WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [matchId, req.tenantId]
    );
    if (!m.rows[0]) throw ApiError.notFound('Match not found');

    const { home_team_id, away_team_id } = m.rows[0];
    if (teamId !== home_team_id && teamId !== away_team_id) {
      throw ApiError.badRequest('That team is not part of this match');
    }
    const isHome = teamId === home_team_id;

    // Persist the formation on the relevant side.
    await client.query(
      `UPDATE matches SET ${isHome ? 'home_formation' : 'away_formation'} = $3
         WHERE id = $1 AND tenant_id = $2`,
      [matchId, req.tenantId, formation ?? null]
    );

    // Replace this team's lineup rows.
    await client.query(
      `DELETE FROM match_lineups WHERE match_id = $1 AND team_id = $2`,
      [matchId, teamId]
    );

    for (const p of players) {
      await client.query(
        `INSERT INTO match_lineups
           (tenant_id, match_id, team_id, player_id, is_starting, jersey_number, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.tenantId,
          matchId,
          teamId,
          p.playerId,
          p.isStarting ?? true,
          p.jerseyNumber ?? null,
          p.position ?? null,
        ]
      );
    }

    const { rows } = await client.query(
      `${SELECT_LINEUP}
        WHERE l.match_id = $1
        ORDER BY l.is_starting DESC, l.jersey_number NULLS LAST`,
      [matchId]
    );
    return rows;
  });

  res.status(201).json(result.map(toLineupRow));
});
