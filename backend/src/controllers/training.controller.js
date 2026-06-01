import { query, withTransaction } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const toSession = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  teamId: r.team_id,
  teamName: r.team_name,
  title: r.title,
  location: r.location,
  focus: r.focus,
  scheduledAt: r.scheduled_at,
  durationMin: r.duration_min,
  createdBy: r.created_by,
  attendingCount: r.attending_count != null ? Number(r.attending_count) : undefined,
});

const toAttendance = (r) => ({
  id: r.id,
  sessionId: r.session_id,
  playerId: r.player_id,
  status: r.status,
  note: r.note,
  firstName: r.first_name,
  lastName: r.last_name,
  jerseyNumber: r.jersey_number,
  position: r.position,
});

// Teams the caller may manage. COACH is restricted to teams they coach;
// CLUB_ADMIN sees every team in their club; SYSTEM_ADMIN every team.
const coachTeamFilter = (req, alias = 't') => {
  if (req.user.role === 'COACH') {
    return { clause: `${alias}.coach_id = $COACH`, coachId: req.user.id };
  }
  return { clause: '', coachId: null };
};

/**
 * List training sessions visible to the caller. COACH sees their teams only;
 * CLUB_ADMIN sees the whole club. Optional ?teamId= and ?scope=upcoming|past.
 */
export const listTrainingSessions = asyncHandler(async (req, res) => {
  const { teamId, scope } = req.query;
  const params = [];
  const conds = [];

  if (req.tenantId) {
    params.push(req.tenantId);
    conds.push(`ts.tenant_id = $${params.length}`);
  }
  if (req.user.role === 'COACH') {
    params.push(req.user.id);
    conds.push(`t.coach_id = $${params.length}`);
  }
  if (teamId) {
    params.push(teamId);
    conds.push(`ts.team_id = $${params.length}`);
  }
  if (scope === 'upcoming') conds.push(`ts.scheduled_at >= now()`);
  if (scope === 'past') conds.push(`ts.scheduled_at < now()`);

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT ts.*, t.name AS team_name,
            (SELECT COUNT(*) FROM training_attendance a
              WHERE a.session_id = ts.id AND a.status = 'PRESENT') AS attending_count
       FROM training_sessions ts
       JOIN teams t ON t.id = ts.team_id
       ${where}
       ORDER BY ts.scheduled_at DESC`,
    params
  );
  res.json(rows.map(toSession));
});

// Ensure a team belongs to the tenant and (for a coach) is theirs.
const assertTeamManageable = async (req, teamId) => {
  const { rows } = await query(
    `SELECT id, coach_id FROM teams
      WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)`,
    [teamId, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Team not found');
  if (req.user.role === 'COACH' && rows[0].coach_id !== req.user.id) {
    throw ApiError.forbidden('You can only manage your own teams');
  }
};

export const createTrainingSession = asyncHandler(async (req, res) => {
  const { teamId, title, location, focus, scheduledAt, durationMin } = req.body;
  if (!req.tenantId) throw ApiError.badRequest('Select a club before scheduling training');
  await assertTeamManageable(req, teamId);

  const { rows } = await query(
    `INSERT INTO training_sessions
       (tenant_id, team_id, title, location, focus, scheduled_at, duration_min, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      req.tenantId,
      teamId,
      title,
      location ?? null,
      focus ?? null,
      scheduledAt,
      durationMin ?? null,
      req.user.id,
    ]
  );
  const team = await query(`SELECT name FROM teams WHERE id = $1`, [teamId]);
  res.status(201).json(toSession({ ...rows[0], team_name: team.rows[0]?.name }));
});

export const updateTrainingSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await query(
    `SELECT ts.*, t.coach_id FROM training_sessions ts
       JOIN teams t ON t.id = ts.team_id
      WHERE ts.id = $1 AND ($2::uuid IS NULL OR ts.tenant_id = $2)`,
    [id, req.tenantId]
  );
  if (!existing.rows[0]) throw ApiError.notFound('Training session not found');
  if (req.user.role === 'COACH' && existing.rows[0].coach_id !== req.user.id) {
    throw ApiError.forbidden('You can only manage your own teams');
  }

  const { title, location, focus, scheduledAt, durationMin } = req.body;
  const { rows } = await query(
    `UPDATE training_sessions
        SET title = COALESCE($2, title),
            location = COALESCE($3, location),
            focus = COALESCE($4, focus),
            scheduled_at = COALESCE($5, scheduled_at),
            duration_min = COALESCE($6, duration_min)
      WHERE id = $1 RETURNING *`,
    [id, title ?? null, location ?? null, focus ?? null, scheduledAt ?? null, durationMin ?? null]
  );
  res.json(toSession(rows[0]));
});

export const deleteTrainingSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await query(
    `SELECT ts.id, t.coach_id FROM training_sessions ts
       JOIN teams t ON t.id = ts.team_id
      WHERE ts.id = $1 AND ($2::uuid IS NULL OR ts.tenant_id = $2)`,
    [id, req.tenantId]
  );
  if (!existing.rows[0]) throw ApiError.notFound('Training session not found');
  if (req.user.role === 'COACH' && existing.rows[0].coach_id !== req.user.id) {
    throw ApiError.forbidden('You can only manage your own teams');
  }
  await query(`DELETE FROM training_sessions WHERE id = $1`, [id]);
  res.status(204).end();
});

/**
 * Attendance roster for a session: every player on the team with their
 * recorded status (defaults to UNKNOWN if not yet marked).
 */
export const getTrainingAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await query(
    `SELECT ts.*, t.name AS team_name, t.coach_id
       FROM training_sessions ts
       JOIN teams t ON t.id = ts.team_id
      WHERE ts.id = $1 AND ($2::uuid IS NULL OR ts.tenant_id = $2)`,
    [id, req.tenantId]
  );
  if (!session.rows[0]) throw ApiError.notFound('Training session not found');

  const { rows } = await query(
    `SELECT p.id AS player_id, p.first_name, p.last_name, p.jersey_number, p.position,
            a.id, a.session_id, a.status, a.note
       FROM players p
       LEFT JOIN training_attendance a
         ON a.player_id = p.id AND a.session_id = $1
      WHERE p.team_id = $2 AND p.is_active = TRUE
      ORDER BY p.jersey_number NULLS LAST, p.last_name`,
    [id, session.rows[0].team_id]
  );

  res.json({
    session: toSession(session.rows[0]),
    attendance: rows.map((r) => toAttendance({ ...r, status: r.status || 'UNKNOWN' })),
  });
});

/**
 * Upsert attendance for one session. Body: { entries: [{ playerId, status, note }] }.
 * Coach-only for their own team; CLUB_ADMIN for any club team.
 */
export const saveTrainingAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { entries } = req.body;

  const session = await query(
    `SELECT ts.team_id, t.coach_id FROM training_sessions ts
       JOIN teams t ON t.id = ts.team_id
      WHERE ts.id = $1 AND ts.tenant_id = $2`,
    [id, req.tenantId]
  );
  if (!session.rows[0]) throw ApiError.notFound('Training session not found');
  if (req.user.role === 'COACH' && session.rows[0].coach_id !== req.user.id) {
    throw ApiError.forbidden('You can only manage your own teams');
  }

  await withTransaction(async (client) => {
    for (const e of entries) {
      await client.query(
        `INSERT INTO training_attendance (tenant_id, session_id, player_id, status, note)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id, player_id)
         DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note`,
        [req.tenantId, id, e.playerId, e.status ?? 'UNKNOWN', e.note ?? null]
      );
    }
  });

  res.status(204).end();
});
