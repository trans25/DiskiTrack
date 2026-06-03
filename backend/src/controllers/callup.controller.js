import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendCallupEmail } from '../utils/mailer.js';

// Build a readable fixture label from a match row.
const fixtureLabel = (m) => {
  const home = m.home_team_name || m.home_team_label || 'Home';
  const away = m.away_team_name || m.away_team_label || 'Away';
  return `${home} vs ${away}`;
};

// COACH / CLUB_ADMIN — read the current travelling squad for a fixture.
export const getCallup = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT mc.player_id, p.first_name, p.last_name, p.jersey_number, p.position, p.email
       FROM match_callups mc
       JOIN players p ON p.id = mc.player_id
      WHERE mc.match_id = $1 AND mc.tenant_id = $2
      ORDER BY p.jersey_number NULLS LAST, p.last_name`,
    [req.params.matchId, req.tenantId]
  );
  res.json(
    rows.map((r) => ({
      playerId: r.player_id,
      firstName: r.first_name,
      lastName: r.last_name,
      jerseyNumber: r.jersey_number,
      position: r.position,
      email: r.email,
    }))
  );
});

// COACH / CLUB_ADMIN — set the travelling squad and (optionally) alert them.
export const setCallup = asyncHandler(async (req, res) => {
  const { playerIds, notify } = req.body;
  const matchId = req.params.matchId;

  // Confirm the fixture belongs to this club and load its details.
  const matchRes = await query(
    `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name
       FROM matches m
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
      WHERE m.id = $1 AND m.tenant_id = $2`,
    [matchId, req.tenantId]
  );
  const match = matchRes.rows[0];
  if (!match) throw ApiError.notFound('Match not found');

  // Replace the existing call-up with the new selection.
  await query(`DELETE FROM match_callups WHERE match_id = $1 AND tenant_id = $2`, [
    matchId,
    req.tenantId,
  ]);

  const values = playerIds.map((_, i) => `($1, $2, $${i + 3})`).join(', ');
  await query(
    `INSERT INTO match_callups (tenant_id, match_id, player_id)
     VALUES ${values}
     ON CONFLICT (match_id, player_id) DO NOTHING`,
    [req.tenantId, matchId, ...playerIds]
  );

  let delivered = 0;
  if (notify) {
    const club = await query(`SELECT name FROM clubs WHERE id = $1`, [req.tenantId]);
    const clubName = club.rows[0]?.name || 'Your club';
    const senderName = `${req.user.firstName ?? ''} ${req.user.lastName ?? ''}`.trim() || clubName;
    const fixture = fixtureLabel(match);
    const kickoff = match.scheduled_at
      ? new Date(match.scheduled_at).toLocaleString()
      : null;

    const players = await query(
      `SELECT first_name, email FROM players
        WHERE tenant_id = $1 AND id = ANY($2::uuid[]) AND email IS NOT NULL`,
      [req.tenantId, playerIds]
    );
    for (const p of players.rows) {
      try {
        const result = await sendCallupEmail({
          to: p.email,
          recipientName: p.first_name,
          clubName,
          fixture,
          venue: match.venue,
          kickoff,
          senderName,
        });
        if (result?.delivered) delivered += 1;
      } catch (err) {
        console.error(`[callup] failed to email ${p.email}: ${err.message}`);
      }
    }
  }

  res.status(201).json({
    matchId,
    squadSize: playerIds.length,
    notified: !!notify,
    delivered,
  });
});
