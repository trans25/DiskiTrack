import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { tenantFilter } from '../utils/tenantFilter.js';

const toTeam = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  clubId: r.tenant_id,
  clubName: r.club_name,
  name: r.name,
  ageGroup: r.age_group,
  category: r.category,
  coachId: r.coach_id,
  createdAt: r.created_at,
});

export const listTeams = asyncHandler(async (req, res) => {
  // SYSTEM_ADMIN (no tenant) sees every club's teams; others are scoped.
  const { clause, params } = tenantFilter(req.tenantId, 't.tenant_id');
  const where = clause ? `WHERE ${clause}` : '';
  const { rows } = await query(
    `SELECT t.*, c.name AS club_name
       FROM teams t
       JOIN clubs c ON c.id = t.tenant_id
       ${where}
       ORDER BY c.name, t.age_group, t.category, t.name`,
    params
  );
  res.json(rows.map(toTeam));
});

export const getTeam = asyncHandler(async (req, res) => {
  // SYSTEM_ADMIN (null tenant) can fetch any team by id.
  const { rows } = await query(
    `SELECT * FROM teams WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Team not found');
  res.json(toTeam(rows[0]));
});

export const createTeam = asyncHandler(async (req, res) => {
  const { name, ageGroup, category, coachId } = req.body;
  // Creating a team needs a concrete tenant. A SYSTEM_ADMIN must target one
  // via the x-tenant-id header (or ?tenantId=).
  if (!req.tenantId) {
    throw ApiError.badRequest(
      'Select a club (x-tenant-id) before creating a team'
    );
  }
  const { rows } = await query(
    `INSERT INTO teams (tenant_id, name, age_group, category, coach_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.tenantId, name, ageGroup, category, coachId ?? null]
  );
  res.status(201).json(toTeam(rows[0]));
});

export const updateTeam = asyncHandler(async (req, res) => {
  const { name, ageGroup, category, coachId } = req.body;
  const { rows } = await query(
    `UPDATE teams
        SET name = COALESCE($3, name),
            age_group = COALESCE($4, age_group),
            category = COALESCE($5, category),
            coach_id = COALESCE($6, coach_id)
      WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)
      RETURNING *`,
    [req.params.id, req.tenantId, name, ageGroup, category, coachId]
  );
  if (!rows[0]) throw ApiError.notFound('Team not found');
  res.json(toTeam(rows[0]));
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    `DELETE FROM teams WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)`,
    [req.params.id, req.tenantId]
  );
  if (!rowCount) throw ApiError.notFound('Team not found');
  res.status(204).send();
});

// Full team profile: roster, staff, recent form and aggregated stats.
export const getTeamOverview = asyncHandler(async (req, res) => {
  const teamId = req.params.id;
  const t = req.tenantId;

  // 1. Team + club + assigned coach.
  const teamRes = await query(
    `SELECT te.*, c.name AS club_name,
            co.id AS coach_user_id, co.first_name AS coach_first_name,
            co.last_name AS coach_last_name, co.email AS coach_email
       FROM teams te
       JOIN clubs c ON c.id = te.tenant_id
       LEFT JOIN users co ON co.id = te.coach_id
      WHERE te.id = $1 AND ($2::uuid IS NULL OR te.tenant_id = $2)`,
    [teamId, t]
  );
  const team = teamRes.rows[0];
  if (!team) throw ApiError.notFound('Team not found');

  // 2. Players in the team with computed age + aggregated career stats.
  const playersRes = await query(
    `SELECT p.id, p.first_name, p.last_name, p.position, p.jersey_number,
            p.date_of_birth, p.photo_url, p.is_active,
            date_part('year', age(p.date_of_birth))::int AS age,
            COALESCE(SUM(ps.goals), 0)::int        AS goals,
            COALESCE(SUM(ps.assists), 0)::int      AS assists,
            COALESCE(SUM(ps.shots), 0)::int        AS shots,
            COALESCE(SUM(ps.fouls), 0)::int        AS fouls,
            COALESCE(SUM(ps.yellow_cards), 0)::int AS yellow_cards,
            COALESCE(SUM(ps.red_cards), 0)::int    AS red_cards,
            COUNT(DISTINCT ps.match_id)::int       AS matches_played
       FROM players p
       LEFT JOIN player_stats ps ON ps.player_id = p.id
      WHERE p.team_id = $1
      GROUP BY p.id
      ORDER BY p.jersey_number NULLS LAST, p.last_name, p.first_name`,
    [teamId]
  );

  // 3. Staff working with the team: the assigned coach plus club coaches/analysts.
  const staffRes = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active,
            (u.id = $2) AS is_team_coach
       FROM users u
      WHERE u.tenant_id = $1
        AND u.role IN ('COACH', 'ANALYST', 'CLUB_ADMIN')
      ORDER BY (u.id = $2) DESC, u.role, u.last_name`,
    [team.tenant_id, team.coach_id]
  );

  // 4. Recent finished matches involving this team (form, last 5).
  const matchesRes = await query(
    `SELECT m.id, m.scheduled_at, m.status, m.home_score, m.away_score,
            m.home_team_id, m.away_team_id,
            ht.name AS home_team_name, at.name AS away_team_name
       FROM matches m
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
      WHERE (m.home_team_id = $1 OR m.away_team_id = $1)
        AND m.status = 'FINISHED'
      ORDER BY m.scheduled_at DESC
      LIMIT 5`,
    [teamId]
  );

  const form = matchesRes.rows.map((m) => {
    const isHome = m.home_team_id === teamId;
    const gf = isHome ? m.home_score : m.away_score;
    const ga = isHome ? m.away_score : m.home_score;
    const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
    return {
      matchId: m.id,
      date: m.scheduled_at,
      opponent: isHome ? m.away_team_name : m.home_team_name,
      isHome,
      goalsFor: gf,
      goalsAgainst: ga,
      result,
    };
  });

  const record = form.reduce(
    (acc, f) => {
      if (f.result === 'W') acc.wins += 1;
      else if (f.result === 'L') acc.losses += 1;
      else acc.draws += 1;
      acc.goalsFor += f.goalsFor;
      acc.goalsAgainst += f.goalsAgainst;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
  );

  const players = playersRes.rows.map((p) => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    position: p.position,
    jerseyNumber: p.jersey_number,
    dateOfBirth: p.date_of_birth,
    age: p.age,
    photoUrl: p.photo_url,
    isActive: p.is_active,
    stats: {
      goals: p.goals,
      assists: p.assists,
      shots: p.shots,
      fouls: p.fouls,
      yellowCards: p.yellow_cards,
      redCards: p.red_cards,
      matchesPlayed: p.matches_played,
    },
  }));

  // 5. Team-wide aggregated stats from the roster totals.
  const totals = players.reduce(
    (acc, p) => {
      acc.goals += p.stats.goals;
      acc.assists += p.stats.assists;
      acc.shots += p.stats.shots;
      acc.fouls += p.stats.fouls;
      acc.yellowCards += p.stats.yellowCards;
      acc.redCards += p.stats.redCards;
      return acc;
    },
    { goals: 0, assists: 0, shots: 0, fouls: 0, yellowCards: 0, redCards: 0 }
  );

  res.json({
    team: {
      id: team.id,
      name: team.name,
      ageGroup: team.age_group,
      category: team.category,
      clubId: team.tenant_id,
      clubName: team.club_name,
      coach: team.coach_user_id
        ? {
            id: team.coach_user_id,
            firstName: team.coach_first_name,
            lastName: team.coach_last_name,
            email: team.coach_email,
          }
        : null,
    },
    counts: {
      players: players.length,
      activePlayers: players.filter((p) => p.isActive).length,
      staff: staffRes.rows.length,
    },
    players,
    staff: staffRes.rows.map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      email: s.email,
      role: s.role,
      isActive: s.is_active,
      isTeamCoach: s.is_team_coach,
    })),
    form,
    record,
    totals,
  });
});
