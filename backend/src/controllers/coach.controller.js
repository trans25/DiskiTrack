import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Coach home overview: the teams this coach runs (with squad sizes), their
 * upcoming fixtures, and upcoming training sessions. Scoped to the coach's
 * own teams within their club.
 */
export const coachOverview = asyncHandler(async (req, res) => {
  const coachId = req.user.id;
  const tenantId = req.tenantId;

  const teamsP = query(
    `SELECT t.id, t.name, t.age_group, t.category,
            (SELECT COUNT(*) FROM players p
              WHERE p.team_id = t.id AND p.is_active = TRUE)::int AS player_count
       FROM teams t
      WHERE t.coach_id = $1 AND ($2::uuid IS NULL OR t.tenant_id = $2)
      ORDER BY t.age_group, t.name`,
    [coachId, tenantId]
  );

  const fixturesP = query(
    `SELECT m.id, m.scheduled_at, m.status, m.venue,
            m.home_team_id, m.away_team_id,
            COALESCE(ht.name, m.home_team_label) AS home_team_name,
            COALESCE(at.name, m.away_team_label) AS away_team_name,
            m.home_score, m.away_score
       FROM matches m
       LEFT JOIN teams ht ON ht.id = m.home_team_id
       LEFT JOIN teams at ON at.id = m.away_team_id
      WHERE m.tenant_id = $2
        AND (m.home_team_id IN (SELECT id FROM teams WHERE coach_id = $1)
          OR m.away_team_id IN (SELECT id FROM teams WHERE coach_id = $1))
        AND (m.status IN ('SCHEDULED', 'LIVE') OR m.scheduled_at >= now() - interval '7 days')
      ORDER BY m.scheduled_at ASC
      LIMIT 8`,
    [coachId, tenantId]
  );

  const trainingP = query(
    `SELECT ts.id, ts.title, ts.location, ts.scheduled_at, ts.team_id, t.name AS team_name
       FROM training_sessions ts
       JOIN teams t ON t.id = ts.team_id
      WHERE t.coach_id = $1 AND ts.tenant_id = $2 AND ts.scheduled_at >= now()
      ORDER BY ts.scheduled_at ASC
      LIMIT 6`,
    [coachId, tenantId]
  );

  const [teams, fixtures, training] = await Promise.all([teamsP, fixturesP, trainingP]);

  res.json({
    teams: teams.rows.map((r) => ({
      id: r.id,
      name: r.name,
      ageGroup: r.age_group,
      category: r.category,
      playerCount: r.player_count,
    })),
    fixtures: fixtures.rows.map((r) => ({
      id: r.id,
      scheduledAt: r.scheduled_at,
      status: r.status,
      venue: r.venue,
      homeTeamId: r.home_team_id,
      awayTeamId: r.away_team_id,
      homeTeamName: r.home_team_name,
      awayTeamName: r.away_team_name,
      homeScore: r.home_score,
      awayScore: r.away_score,
    })),
    training: training.rows.map((r) => ({
      id: r.id,
      title: r.title,
      location: r.location,
      scheduledAt: r.scheduled_at,
      teamId: r.team_id,
      teamName: r.team_name,
    })),
  });
});
