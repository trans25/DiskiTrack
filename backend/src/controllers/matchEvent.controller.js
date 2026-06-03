import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToMatch } from '../realtime/socket.js';

const toEvent = (r) => ({
  id: r.id,
  matchId: r.match_id,
  teamId: r.team_id,
  playerId: r.player_id,
  relatedPlayerId: r.related_player_id,
  eventType: r.event_type,
  minute: r.minute,
  videoSeconds: r.video_seconds,
  notes: r.notes,
  createdAt: r.created_at,
  playerName: r.player_name,
});

const SELECT_WITH_PLAYER = `
  SELECT e.*,
         (p.first_name || ' ' || p.last_name) AS player_name
    FROM match_events e
    LEFT JOIN players p ON p.id = e.player_id
`;

/** Map an event type to the player_stats column it increments (if any). */
const STAT_COLUMN = {
  GOAL: 'goals',
  PENALTY_GOAL: 'goals',
  ASSIST: 'assists',
  SHOT: 'shots',
  SHOT_ON_TARGET: 'shots_on_target',
  SAVE: 'saves',
  TACKLE: 'tackles',
  INTERCEPTION: 'interceptions',
  OFFSIDE: 'offsides',
  OWN_GOAL: 'own_goals',
  FOUL: 'fouls',
  YELLOW_CARD: 'yellow_cards',
  RED_CARD: 'red_cards',
};

// Event types that put the ball in the net. A SHOT_ON_TARGET also counts as a
// shot attempt, so we mirror it into the shots column too.
const SCORING_EVENTS = new Set(['GOAL', 'PENALTY_GOAL', 'OWN_GOAL']);

export const listMatchEvents = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `${SELECT_WITH_PLAYER}
      WHERE e.match_id = $1 AND ($2::uuid IS NULL OR e.tenant_id = $2)
      ORDER BY COALESCE(e.minute, e.video_seconds / 60) NULLS LAST, e.video_seconds NULLS LAST, e.created_at ASC`,
    [req.params.matchId, req.tenantId]
  );
  res.json(rows.map(toEvent));
});

/**
 * CORE FEATURE — create a live match event.
 * In a single transaction we:
 *   1. validate the match is LIVE and tenant-scoped,
 *   2. insert the event,
 *   3. update the live scoreboard for GOAL events,
 *   4. upsert the player's per-match stats,
 * then emit the event + fresh scoreboard to the match room over Socket.io.
 */
export const createMatchEvent = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const { teamId, eventType, playerId, relatedPlayerId, minute, videoSeconds, notes } = req.body;

  const result = await withTransaction(async (client) => {
    // Lock the match row to serialize concurrent score updates.
    const matchRes = await client.query(
      `SELECT * FROM matches WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [matchId, req.tenantId]
    );
    const match = matchRes.rows[0];
    if (!match) throw ApiError.notFound('Match not found');
    if (match.status !== 'LIVE' && match.status !== 'FINISHED') {
      throw ApiError.badRequest('Events can only be logged for LIVE or FINISHED matches');
    }
    if (teamId !== match.home_team_id && teamId !== match.away_team_id) {
      throw ApiError.badRequest('Team is not part of this match');
    }

    // 2. Insert the event.
    const insertRes = await client.query(
      `INSERT INTO match_events
         (tenant_id, match_id, team_id, player_id, related_player_id, event_type, minute, video_seconds, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        req.tenantId,
        matchId,
        teamId,
        playerId ?? null,
        relatedPlayerId ?? null,
        eventType,
        minute ?? null,
        videoSeconds ?? null,
        notes ?? null,
        req.user.id,
      ]
    );

    // 3. Scoreboard update on goals (incl. penalties and own goals).
    //    An OWN_GOAL is logged against the conceding player's team but the
    //    goal counts for the OPPONENT, so we flip the scoring side.
    let updatedMatch = match;
    if (SCORING_EVENTS.has(eventType)) {
      const scoringTeamIsHome =
        eventType === 'OWN_GOAL'
          ? teamId !== match.home_team_id
          : teamId === match.home_team_id;
      const column = scoringTeamIsHome ? 'home_score' : 'away_score';
      const scoreRes = await client.query(
        `UPDATE matches SET ${column} = ${column} + 1
          WHERE id = $1 RETURNING *`,
        [matchId]
      );
      updatedMatch = scoreRes.rows[0];
    }

    // 4. Upsert per-match player stats for the relevant player.
    const statColumn = STAT_COLUMN[eventType];
    if (statColumn && playerId) {
      await client.query(
        `INSERT INTO player_stats (tenant_id, match_id, player_id, ${statColumn})
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (match_id, player_id)
         DO UPDATE SET ${statColumn} = player_stats.${statColumn} + 1`,
        [req.tenantId, matchId, playerId]
      );
    }
    // A shot on target also counts as a shot attempt.
    if (eventType === 'SHOT_ON_TARGET' && playerId) {
      await client.query(
        `INSERT INTO player_stats (tenant_id, match_id, player_id, shots)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (match_id, player_id)
         DO UPDATE SET shots = player_stats.shots + 1`,
        [req.tenantId, matchId, playerId]
      );
    }
    // A goal's assisting player also gets credited.
    if ((eventType === 'GOAL' || eventType === 'PENALTY_GOAL') && relatedPlayerId) {
      await client.query(
        `INSERT INTO player_stats (tenant_id, match_id, player_id, assists)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (match_id, player_id)
         DO UPDATE SET assists = player_stats.assists + 1`,
        [req.tenantId, matchId, relatedPlayerId]
      );
    }

    const eventRes = await client.query(
      `${SELECT_WITH_PLAYER} WHERE e.id = $1`,
      [insertRes.rows[0].id]
    );

    return { event: eventRes.rows[0], match: updatedMatch };
  });

  const payloadEvent = toEvent(result.event);
  const scoreboard = {
    matchId,
    homeScore: result.match.home_score,
    awayScore: result.match.away_score,
  };

  // Real-time fan-out to everyone in the match room.
  emitToMatch(matchId, 'match:event', payloadEvent);
  emitToMatch(matchId, 'match:scoreboard', scoreboard);

  res.status(201).json({ event: payloadEvent, scoreboard });
});

export const deleteMatchEvent = asyncHandler(async (req, res) => {
  const { matchId, eventId } = req.params;
  const { rowCount } = await query(
    `DELETE FROM match_events WHERE id = $1 AND match_id = $2 AND tenant_id = $3`,
    [eventId, matchId, req.tenantId]
  );
  if (!rowCount) throw ApiError.notFound('Event not found');
  emitToMatch(matchId, 'match:event:deleted', { matchId, eventId });
  res.status(204).send();
});
