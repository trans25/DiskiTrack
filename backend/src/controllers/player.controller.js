import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const toPlayer = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  teamId: r.team_id,
  firstName: r.first_name,
  lastName: r.last_name,
  dateOfBirth: r.date_of_birth,
  position: r.position,
  jerseyNumber: r.jersey_number,
  photoUrl: r.photo_url,
  clubLogoUrl: r.club_logo_url ?? null,
  isActive: r.is_active,
});

export const listPlayers = asyncHandler(async (req, res) => {
  const { teamId } = req.query;
  // SYSTEM_ADMIN (null tenant) sees players across all clubs.
  const params = [req.tenantId];
  let sql = `SELECT p.*, c.logo_url AS club_logo_url
               FROM players p
               LEFT JOIN clubs c ON c.id = p.tenant_id
              WHERE ($1::uuid IS NULL OR p.tenant_id = $1)`;
  if (teamId) {
    params.push(teamId);
    sql += ` AND p.team_id = $${params.length}`;
  }
  sql += ` ORDER BY p.last_name, p.first_name`;
  const { rows } = await query(sql, params);
  res.json(rows.map(toPlayer));
});

export const getPlayer = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM players WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Player not found');
  res.json(toPlayer(rows[0]));
});

export const createPlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, teamId, dateOfBirth, position, jerseyNumber, photoUrl } =
    req.body;
  const { rows } = await query(
    `INSERT INTO players
       (tenant_id, team_id, first_name, last_name, date_of_birth, position, jersey_number, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      req.tenantId,
      teamId ?? null,
      firstName,
      lastName,
      dateOfBirth ?? null,
      position ?? null,
      jerseyNumber ?? null,
      photoUrl ?? null,
    ]
  );
  res.status(201).json(toPlayer(rows[0]));
});

export const updatePlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, teamId, dateOfBirth, position, jerseyNumber, photoUrl } =
    req.body;
  const { rows } = await query(
    `UPDATE players
        SET first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            team_id = COALESCE($5, team_id),
            date_of_birth = COALESCE($6, date_of_birth),
            position = COALESCE($7, position),
            jersey_number = COALESCE($8, jersey_number),
            photo_url = COALESCE($9, photo_url)
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [
      req.params.id,
      req.tenantId,
      firstName,
      lastName,
      teamId,
      dateOfBirth,
      position,
      jerseyNumber,
      photoUrl,
    ]
  );
  if (!rows[0]) throw ApiError.notFound('Player not found');
  res.json(toPlayer(rows[0]));
});

// Aggregated career stats across all matches for a player.
export const getPlayerStats = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT
        COALESCE(SUM(goals), 0)        AS goals,
        COALESCE(SUM(assists), 0)      AS assists,
        COALESCE(SUM(shots), 0)        AS shots,
        COALESCE(SUM(fouls), 0)        AS fouls,
        COALESCE(SUM(yellow_cards), 0) AS yellow_cards,
        COALESCE(SUM(red_cards), 0)    AS red_cards,
        COUNT(DISTINCT match_id)       AS matches_played
       FROM player_stats
      WHERE player_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)`,
    [req.params.id, req.tenantId]
  );
  res.json(rows[0]);
});

// Full player profile: bio, career totals, per-match breakdown (for charts).
export const getPlayerProfile = asyncHandler(async (req, res) => {
  const playerId = req.params.id;
  const t = req.tenantId;

  // 1. Player bio + team + computed age.
  const playerRes = await query(
    `SELECT p.*, t.name AS team_name, t.age_group, t.category,
            c.logo_url AS club_logo_url,
            date_part('year', age(p.date_of_birth))::int AS age
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
       LEFT JOIN clubs c ON c.id = p.tenant_id
      WHERE p.id = $1 AND ($2::uuid IS NULL OR p.tenant_id = $2)`,
    [playerId, t]
  );
  const p = playerRes.rows[0];
  if (!p) throw ApiError.notFound('Player not found');

  // 2. Career totals + appearances.
  const totalsRes = await query(
    `SELECT
        COALESCE(SUM(goals), 0)::int          AS goals,
        COALESCE(SUM(assists), 0)::int        AS assists,
        COALESCE(SUM(shots), 0)::int          AS shots,
        COALESCE(SUM(fouls), 0)::int          AS fouls,
        COALESCE(SUM(yellow_cards), 0)::int   AS yellow_cards,
        COALESCE(SUM(red_cards), 0)::int      AS red_cards,
        COALESCE(SUM(minutes_played), 0)::int AS minutes_played,
        COUNT(DISTINCT match_id)::int         AS matches_played
       FROM player_stats
      WHERE player_id = $1`,
    [playerId]
  );

  // 3. Per-match breakdown (chronological) for trend charts.
  const perMatchRes = await query(
    `SELECT ps.match_id, ps.goals, ps.assists, ps.shots, ps.fouls,
            ps.yellow_cards, ps.red_cards, ps.minutes_played,
            m.scheduled_at, m.home_team_id, m.away_team_id,
            m.home_score, m.away_score,
            ht.name AS home_team_name, at.name AS away_team_name
       FROM player_stats ps
       JOIN matches m ON m.id = ps.match_id
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams at ON at.id = m.away_team_id
      WHERE ps.player_id = $1
      ORDER BY m.scheduled_at ASC`,
    [playerId]
  );

  const playerTeamId = p.team_id;
  const perMatch = perMatchRes.rows.map((r, idx) => {
    const isHome = r.home_team_id === playerTeamId;
    const opponent = isHome ? r.away_team_name : r.home_team_name;
    return {
      matchId: r.match_id,
      index: idx + 1,
      date: r.scheduled_at,
      opponent,
      label: opponent ? `vs ${opponent}` : `Match ${idx + 1}`,
      goals: r.goals,
      assists: r.assists,
      shots: r.shots,
      fouls: r.fouls,
      yellowCards: r.yellow_cards,
      redCards: r.red_cards,
      minutesPlayed: r.minutes_played,
    };
  });

  const totals = totalsRes.rows[0];
  const mp = totals.matches_played || 0;
  const averages = {
    goalsPerMatch: mp ? +(totals.goals / mp).toFixed(2) : 0,
    assistsPerMatch: mp ? +(totals.assists / mp).toFixed(2) : 0,
    shotsPerMatch: mp ? +(totals.shots / mp).toFixed(2) : 0,
    minutesPerMatch: mp ? Math.round(totals.minutes_played / mp) : 0,
  };
  const shotConversion =
    totals.shots > 0 ? +((totals.goals / totals.shots) * 100).toFixed(1) : 0;

  res.json({
    player: {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      position: p.position,
      jerseyNumber: p.jersey_number,
      dateOfBirth: p.date_of_birth,
      age: p.age,
      photoUrl: p.photo_url,
      clubLogoUrl: p.club_logo_url ?? null,
      isActive: p.is_active,
      teamId: p.team_id,
      teamName: p.team_name,
      ageGroup: p.age_group,
      category: p.category,
    },
    totals,
    averages,
    shotConversion,
    perMatch,
  });
});
