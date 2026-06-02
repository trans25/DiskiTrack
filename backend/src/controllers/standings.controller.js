import { query } from '../db/pool.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Computes a league log/standings table from a club's FINISHED matches.
// Every participant (the club's own internal teams AND the external opponent
// labels they have faced) becomes a row with P/W/D/L/GF/GA/GD/Pts.
//
// Optional query param ?teamId=<uuid> narrows the table to matches that the
// given internal team took part in (useful for a per-team log view).
//
// Standard football points: win = 3, draw = 1, loss = 0.
export const getStandings = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId; // null for SYSTEM_ADMIN -> all clubs
  const { teamId } = req.query;

  const params = [tenantId];
  let sql = `
    SELECT m.home_team_id, m.away_team_id,
           COALESCE(ht.name, m.home_team_label) AS home_name,
           COALESCE(at.name, m.away_team_label) AS away_name,
           ht.logo_url AS home_logo, at.logo_url AS away_logo,
           m.home_score, m.away_score
      FROM matches m
      LEFT JOIN teams ht ON ht.id = m.home_team_id
      LEFT JOIN teams at ON at.id = m.away_team_id
     WHERE m.status = 'FINISHED'
       AND ($1::uuid IS NULL OR m.tenant_id = $1)`;
  if (teamId) {
    params.push(teamId);
    sql += ` AND (m.home_team_id = $${params.length} OR m.away_team_id = $${params.length})`;
  }

  const { rows } = await query(sql, params);

  const table = new Map();
  const ensure = (key, name, logo, isInternal) => {
    if (!table.has(key)) {
      table.set(key, {
        key,
        name: name || 'Unknown',
        logoUrl: logo || null,
        isInternal,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
    return table.get(key);
  };

  const apply = (row, gf, ga) => {
    row.played += 1;
    row.goalsFor += gf;
    row.goalsAgainst += ga;
    if (gf > ga) {
      row.won += 1;
      row.points += 3;
    } else if (gf === ga) {
      row.drawn += 1;
      row.points += 1;
    } else {
      row.lost += 1;
    }
  };

  for (const m of rows) {
    const homeKey = m.home_team_id || `label:${m.home_name}`;
    const awayKey = m.away_team_id || `label:${m.away_name}`;
    const home = ensure(homeKey, m.home_name, m.home_logo, !!m.home_team_id);
    const away = ensure(awayKey, m.away_name, m.away_logo, !!m.away_team_id);
    apply(home, m.home_score, m.away_score);
    apply(away, m.away_score, m.home_score);
  }

  const standings = [...table.values()]
    .map((r) => ({ ...r, goalDifference: r.goalsFor - r.goalsAgainst }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name)
    )
    .map((r, i) => ({ ...r, position: i + 1 }));

  res.json(standings);
});
