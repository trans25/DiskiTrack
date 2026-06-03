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

/**
 * Club-wide analytics bundle for CLUB_ADMIN, COACH and ANALYST.
 * Returns everything the Analytics dashboard needs in one round-trip:
 * top scorers, team standings, a monthly goals trend, event-type distribution
 * and a discipline breakdown. All scoped to req.tenantId.
 */
export const clubAnalytics = asyncHandler(async (req, res) => {
  const t = req.tenantId;

  const [scorers, standings, goalsTrend, eventDist, discipline, totals] =
    await Promise.all([
      // Top 8 scorers (clickable -> player profile)
      query(
        `SELECT p.id, p.first_name, p.last_name, p.team_id, t.name AS team_name,
                COALESCE(SUM(s.goals), 0)::int   AS goals,
                COALESCE(SUM(s.assists), 0)::int AS assists
           FROM players p
           LEFT JOIN player_stats s ON s.player_id = p.id
           LEFT JOIN teams t ON t.id = p.team_id
          WHERE p.tenant_id = $1 AND p.is_active = TRUE
          GROUP BY p.id, t.name
         HAVING COALESCE(SUM(s.goals), 0) > 0
          ORDER BY goals DESC, assists DESC
          LIMIT 8`,
        [t]
      ),
      // Team standings: W/D/L, goals for/against, points (clickable -> team)
      query(
        `SELECT tm.id, tm.name,
            COUNT(*) FILTER (WHERE m.status = 'FINISHED')::int AS played,
            COUNT(*) FILTER (WHERE m.status = 'FINISHED' AND (
              (m.home_team_id = tm.id AND m.home_score > m.away_score) OR
              (m.away_team_id = tm.id AND m.away_score > m.home_score)))::int AS wins,
            COUNT(*) FILTER (WHERE m.status = 'FINISHED' AND m.home_score = m.away_score)::int AS draws,
            COUNT(*) FILTER (WHERE m.status = 'FINISHED' AND (
              (m.home_team_id = tm.id AND m.home_score < m.away_score) OR
              (m.away_team_id = tm.id AND m.away_score < m.home_score)))::int AS losses,
            COALESCE(SUM(CASE WHEN m.home_team_id = tm.id THEN m.home_score
                              WHEN m.away_team_id = tm.id THEN m.away_score END)
                     FILTER (WHERE m.status = 'FINISHED'), 0)::int AS goals_for,
            COALESCE(SUM(CASE WHEN m.home_team_id = tm.id THEN m.away_score
                              WHEN m.away_team_id = tm.id THEN m.home_score END)
                     FILTER (WHERE m.status = 'FINISHED'), 0)::int AS goals_against
           FROM teams tm
           LEFT JOIN matches m
             ON (m.home_team_id = tm.id OR m.away_team_id = tm.id)
          WHERE tm.tenant_id = $1
          GROUP BY tm.id
          ORDER BY wins DESC, goals_for DESC, tm.name`,
        [t]
      ),
      // Goals scored by this club's teams per month (line chart)
      query(
        `SELECT to_char(date_trunc('month', m.scheduled_at), 'Mon YYYY') AS label,
                date_trunc('month', m.scheduled_at) AS bucket,
                COALESCE(SUM(s.goals), 0)::int AS goals
           FROM player_stats s
           JOIN matches m ON m.id = s.match_id
          WHERE s.tenant_id = $1
          GROUP BY bucket
          ORDER BY bucket
          LIMIT 12`,
        [t]
      ),
      // Distribution of logged match events (pie)
      query(
        `SELECT event_type, COUNT(*)::int AS count
           FROM match_events
          WHERE tenant_id = $1
          GROUP BY event_type
          ORDER BY count DESC`,
        [t]
      ),
      // Discipline per team (stacked bar)
      query(
        `SELECT tm.name,
                COALESCE(SUM(s.yellow_cards), 0)::int AS yellow,
                COALESCE(SUM(s.red_cards), 0)::int    AS red,
                COALESCE(SUM(s.fouls), 0)::int        AS fouls
           FROM teams tm
           LEFT JOIN players p ON p.team_id = tm.id
           LEFT JOIN player_stats s ON s.player_id = p.id
          WHERE tm.tenant_id = $1
          GROUP BY tm.id
          ORDER BY tm.name`,
        [t]
      ),
      // Headline totals
      query(
        `SELECT
            (SELECT COUNT(*) FROM teams WHERE tenant_id = $1)::int AS teams,
            (SELECT COUNT(*) FROM players WHERE tenant_id = $1 AND is_active = TRUE)::int AS players,
            (SELECT COUNT(*) FROM matches WHERE tenant_id = $1 AND status = 'FINISHED')::int AS matches_played,
            (SELECT COALESCE(SUM(goals), 0) FROM player_stats WHERE tenant_id = $1)::int AS goals`,
        [t]
      ),
    ]);

  res.json({
    totals: totals.rows[0],
    topScorers: scorers.rows,
    standings: standings.rows.map((r) => ({
      ...r,
      points: r.wins * 3 + r.draws,
      goalDiff: r.goals_for - r.goals_against,
    })),
    goalsTrend: goalsTrend.rows.map((r) => ({ label: r.label, goals: r.goals })),
    eventDistribution: eventDist.rows,
    discipline: discipline.rows,
  });
});

/**
 * Platform-wide analytics for SYSTEM_ADMIN (cross-tenant).
 * Per-club breakdown of teams/players/matches/users plus platform totals.
 */
export const platformAnalytics = asyncHandler(async (req, res) => {
  const [byClub, totals, rolesDist] = await Promise.all([
    query(
      `SELECT c.id, c.name,
              (SELECT COUNT(*) FROM teams   WHERE tenant_id = c.id)::int AS teams,
              (SELECT COUNT(*) FROM players WHERE tenant_id = c.id)::int AS players,
              (SELECT COUNT(*) FROM matches WHERE tenant_id = c.id)::int AS matches,
              (SELECT COUNT(*) FROM users   WHERE tenant_id = c.id)::int AS users
         FROM clubs c
        ORDER BY players DESC, c.name`
    ),
    query(
      `SELECT
          (SELECT COUNT(*) FROM clubs)::int   AS clubs,
          (SELECT COUNT(*) FROM teams)::int   AS teams,
          (SELECT COUNT(*) FROM players)::int AS players,
          (SELECT COUNT(*) FROM matches)::int AS matches,
          (SELECT COUNT(*) FROM matches WHERE status = 'LIVE')::int AS live_matches`
    ),
    query(
      `SELECT role, COUNT(*)::int AS count
         FROM users
        GROUP BY role
        ORDER BY count DESC`
    ),
  ]);

  res.json({
    totals: totals.rows[0],
    byClub: byClub.rows,
    rolesDistribution: rolesDist.rows,
  });
});

/**
 * Performance summary for a single coach across all of their teams.
 * Used by the coach dashboard performance panel. Coach-scoped by coach_id.
 */
export const coachPerformance = asyncHandler(async (req, res) => {
  const coachId = req.user.id;
  const t = req.tenantId;

  const { rows } = await query(
    `SELECT tm.id, tm.name,
        COUNT(*) FILTER (WHERE m.status = 'FINISHED')::int AS played,
        COUNT(*) FILTER (WHERE m.status = 'FINISHED' AND (
          (m.home_team_id = tm.id AND m.home_score > m.away_score) OR
          (m.away_team_id = tm.id AND m.away_score > m.home_score)))::int AS wins,
        COUNT(*) FILTER (WHERE m.status = 'FINISHED' AND m.home_score = m.away_score)::int AS draws,
        COUNT(*) FILTER (WHERE m.status = 'FINISHED' AND (
          (m.home_team_id = tm.id AND m.home_score < m.away_score) OR
          (m.away_team_id = tm.id AND m.away_score < m.home_score)))::int AS losses,
        COALESCE(SUM(CASE WHEN m.home_team_id = tm.id THEN m.home_score
                          WHEN m.away_team_id = tm.id THEN m.away_score END)
                 FILTER (WHERE m.status = 'FINISHED'), 0)::int AS goals_for,
        COALESCE(SUM(CASE WHEN m.home_team_id = tm.id THEN m.away_score
                          WHEN m.away_team_id = tm.id THEN m.home_score END)
                 FILTER (WHERE m.status = 'FINISHED'), 0)::int AS goals_against
       FROM teams tm
       LEFT JOIN matches m ON (m.home_team_id = tm.id OR m.away_team_id = tm.id)
      WHERE tm.coach_id = $1 AND tm.tenant_id = $2
      GROUP BY tm.id
      ORDER BY wins DESC, tm.name`,
    [coachId, t]
  );

  res.json({
    teams: rows.map((r) => ({
      ...r,
      points: r.wins * 3 + r.draws,
      goalDiff: r.goals_for - r.goals_against,
    })),
  });
});

/**
 * Analyst self-service reports: everything the logged-in ANALYST has personally
 * recorded (match_events.created_by = req.user.id), scoped to their club.
 * Powers the "My Reports" tab on the analyst dashboard.
 */
export const analystReports = asyncHandler(async (req, res) => {
  const t = req.tenantId;
  const u = req.user.id;

  const [totals, eventDist, trend, recentMatches] = await Promise.all([
    // Headline totals for this analyst.
    query(
      `SELECT
          COUNT(*)::int                                   AS events_logged,
          COUNT(DISTINCT match_id)::int                   AS matches_covered,
          COUNT(*) FILTER (WHERE event_type = 'GOAL')::int AS goals_logged
         FROM match_events
        WHERE tenant_id = $1 AND created_by = $2`,
      [t, u]
    ),
    // Distribution of event types the analyst logged (pie).
    query(
      `SELECT event_type, COUNT(*)::int AS count
         FROM match_events
        WHERE tenant_id = $1 AND created_by = $2
        GROUP BY event_type
        ORDER BY count DESC`,
      [t, u]
    ),
    // Events logged per month (line/bar).
    query(
      `SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') AS label,
              date_trunc('month', created_at) AS bucket,
              COUNT(*)::int AS events
         FROM match_events
        WHERE tenant_id = $1 AND created_by = $2
        GROUP BY bucket
        ORDER BY bucket
        LIMIT 12`,
      [t, u]
    ),
    // Recent matches the analyst tagged, with event counts.
    query(
      `SELECT m.id, m.scheduled_at, m.status, m.home_score, m.away_score,
              ht.name AS home_team_name, at.name AS away_team_name,
              COUNT(e.id)::int AS events_logged,
              MAX(e.created_at) AS last_logged_at
         FROM match_events e
         JOIN matches m ON m.id = e.match_id
         JOIN teams ht ON ht.id = m.home_team_id
         JOIN teams at ON at.id = m.away_team_id
        WHERE e.tenant_id = $1 AND e.created_by = $2
        GROUP BY m.id, ht.name, at.name
        ORDER BY last_logged_at DESC
        LIMIT 10`,
      [t, u]
    ),
  ]);

  res.json({
    totals: totals.rows[0],
    eventDistribution: eventDist.rows,
    trend: trend.rows.map((r) => ({ label: r.label, events: r.events })),
    recentMatches: recentMatches.rows,
  });
});
