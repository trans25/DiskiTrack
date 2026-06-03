import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { emitToMatch } from '../realtime/socket.js';
import { notifyUser } from '../utils/notify.js';

// Notify every player (and their guardians) in the internal team(s) of a new
// fixture so they can open the portal and submit their availability. The team
// ids passed here are only the club's own teams (external sides are skipped).
const notifySquadOfFixture = async ({ tenantId, teamIds, fixture, kickoff }) => {
  const internalTeamIds = teamIds.filter(Boolean);
  if (internalTeamIds.length === 0) return;

  // Player user accounts plus any linked guardian user accounts for the squad.
  const { rows } = await query(
    `SELECT DISTINCT u.id AS user_id
       FROM players p
       JOIN users u ON u.id = p.user_id
      WHERE p.tenant_id = $1 AND p.is_active = TRUE AND p.team_id = ANY($2::uuid[])
      UNION
     SELECT DISTINCT gu.id AS user_id
       FROM players p
       JOIN guardian_players gp ON gp.player_id = p.id
       JOIN guardians g ON g.id = gp.guardian_id
       JOIN users gu ON gu.id = g.user_id
      WHERE p.tenant_id = $1 AND p.is_active = TRUE AND p.team_id = ANY($2::uuid[])`,
    [tenantId, internalTeamIds]
  );

  const body = kickoff
    ? `${fixture} — ${new Date(kickoff).toLocaleString()}. Tap to set your availability.`
    : `${fixture}. Tap to set your availability.`;

  await Promise.all(
    rows.map((r) =>
      notifyUser({
        userId: r.user_id,
        tenantId,
        type: 'INFO',
        title: 'New fixture — set your availability',
        body,
        link: '/dashboard',
      })
    )
  );
};

const toMatch = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  homeTeamId: r.home_team_id,
  awayTeamId: r.away_team_id,
  homeTeamName: r.home_team_name,
  awayTeamName: r.away_team_name,
  homeIsExternal: r.home_team_id == null,
  awayIsExternal: r.away_team_id == null,
  venue: r.venue,
  scheduledAt: r.scheduled_at,
  status: r.status,
  homeScore: r.home_score,
  awayScore: r.away_score,
  kickoffAt: r.kickoff_at,
  finishedAt: r.finished_at,
  videoUrl: r.video_url,
  homeFormation: r.home_formation,
  awayFormation: r.away_formation,
});

// Resolve each side's display name from the linked team, falling back to the
// free-text label used for external (non-system) opponents.
const SELECT_WITH_TEAMS = `
  SELECT m.*,
         COALESCE(ht.name, m.home_team_label) AS home_team_name,
         COALESCE(at.name, m.away_team_label) AS away_team_name
    FROM matches m
    LEFT JOIN teams ht ON ht.id = m.home_team_id
    LEFT JOIN teams at ON at.id = m.away_team_id
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
  const {
    homeTeamId,
    awayTeamId,
    homeTeamLabel,
    awayTeamLabel,
    venue,
    scheduledAt,
    videoUrl,
  } = req.body;

  // At least one side must be one of this club's teams.
  if (!homeTeamId && !awayTeamId) {
    throw ApiError.badRequest('At least one side must be one of your teams');
  }
  if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
    throw ApiError.badRequest('Home and away teams must differ');
  }
  // Each side needs either an internal team or an external label.
  if (!homeTeamId && !homeTeamLabel) {
    throw ApiError.badRequest('Provide a home team or an opponent name');
  }
  if (!awayTeamId && !awayTeamLabel) {
    throw ApiError.badRequest('Provide an away team or an opponent name');
  }

  const { rows } = await query(
    `INSERT INTO matches
       (tenant_id, home_team_id, away_team_id, home_team_label, away_team_label, venue, scheduled_at, video_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      req.tenantId,
      homeTeamId ?? null,
      awayTeamId ?? null,
      homeTeamId ? null : homeTeamLabel,
      awayTeamId ? null : awayTeamLabel,
      venue ?? null,
      scheduledAt,
      videoUrl || null,
    ]
  );
  const { rows: full } = await query(
    `${SELECT_WITH_TEAMS} WHERE m.id = $1`,
    [rows[0].id]
  );
  const match = full[0];

  // Alert the squad (players + guardians) of upcoming fixtures so they can RSVP.
  await notifySquadOfFixture({
    tenantId: req.tenantId,
    teamIds: [match.home_team_id, match.away_team_id],
    fixture: `${match.home_team_name} vs ${match.away_team_name}`,
    kickoff: match.scheduled_at,
  });

  res.status(201).json(toMatch(match));
});

// Transition match status; LIVE sets kickoff, FINISHED stamps finished_at.
export const updateMatchStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await query(
    `UPDATE matches
        SET status = $3::match_status,
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
  const { venue, scheduledAt, homeScore, awayScore, videoUrl } = req.body;
  const { rows } = await query(
    `UPDATE matches
        SET venue = COALESCE($3, venue),
            scheduled_at = COALESCE($4, scheduled_at),
            home_score = COALESCE($5, home_score),
            away_score = COALESCE($6, away_score),
            video_url = COALESCE($7, video_url)
      WHERE id = $1 AND tenant_id = $2
      RETURNING id`,
    [
      req.params.id,
      req.tenantId,
      venue ?? null,
      scheduledAt ?? null,
      homeScore ?? null,
      awayScore ?? null,
      videoUrl === '' ? null : (videoUrl ?? null),
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

// Store an uploaded match video file and point the match at it. The file is
// saved to disk by the upload middleware; here we persist its served URL.
export const uploadMatchVideo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No video file was uploaded');

  // Served statically from /uploads (see app.js).
  const videoUrl = `/uploads/videos/${req.file.filename}`;
  const { rows } = await query(
    `UPDATE matches SET video_url = $3 WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [req.params.id, req.tenantId, videoUrl]
  );
  if (!rows[0]) throw ApiError.notFound('Match not found');

  const { rows: full } = await query(`${SELECT_WITH_TEAMS} WHERE m.id = $1`, [
    rows[0].id,
  ]);
  res.json(toMatch(full[0]));
});
