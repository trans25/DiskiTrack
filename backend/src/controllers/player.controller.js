import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createAuthToken } from '../utils/authTokens.js';
import { sendInviteEmail } from '../utils/mailer.js';
import { config } from '../config/index.js';

// Compute age in whole years from a date-of-birth string/Date.
const ageFromDob = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

// Ensure a GUARDIAN user + guardian profile exists for the given email within
// the club, returning the guardian profile id. New guardians are created as an
// inactive account with an emailed invite link so they can set a password.
// (They can also sign in via their child's ID number — see guardianIdLogin.)
const ensureGuardian = async (tenantId, guardian) => {
  const email = guardian.email.trim().toLowerCase();

  // Existing user with this email in the club?
  const existingUser = await query(
    `SELECT id, role FROM users WHERE tenant_id = $1 AND lower(email) = $2 LIMIT 1`,
    [tenantId, email]
  );

  let userId;
  if (existingUser.rows[0]) {
    userId = existingUser.rows[0].id;
  } else {
    const placeholder = crypto.randomBytes(24).toString('hex');
    const hash = await bcrypt.hash(placeholder, 10);
    const created = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'GUARDIAN', FALSE) RETURNING id`,
      [tenantId, email, hash, guardian.firstName, guardian.lastName]
    );
    userId = created.rows[0].id;

    // Send an invite so the guardian can set a password (best-effort).
    try {
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const token = await createAuthToken(userId, 'INVITE', SEVEN_DAYS);
      const link = `${config.appUrl}/reset-password?token=${token}&purpose=INVITE`;
      const club = await query(`SELECT name FROM clubs WHERE id = $1`, [tenantId]);
      await sendInviteEmail(
        { email, first_name: guardian.firstName, role: 'GUARDIAN' },
        link,
        null,
        club.rows[0]?.name || 'your club'
      );
    } catch (err) {
      console.error(`[player] guardian invite email failed: ${err.message}`);
    }
  }

  // Ensure a guardian profile row exists for this user.
  const profile = await query(
    `SELECT id FROM guardians WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
    [userId, tenantId]
  );
  if (profile.rows[0]) {
    if (guardian.phone || guardian.relationship) {
      await query(
        `UPDATE guardians SET phone = COALESCE($2, phone), relationship = COALESCE($3, relationship)
          WHERE id = $1`,
        [profile.rows[0].id, guardian.phone ?? null, guardian.relationship ?? null]
      );
    }
    return profile.rows[0].id;
  }
  const newProfile = await query(
    `INSERT INTO guardians (tenant_id, user_id, phone, relationship)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [tenantId, userId, guardian.phone ?? null, guardian.relationship ?? null]
  );
  return newProfile.rows[0].id;
};

// Derive contract status the way a club reads it:
//   * no end date          -> UNKNOWN (deal not recorded)
//   * end date in the past -> EXPIRED
//   * <= 6 months left      -> EXPIRING (time to open renewal talks)
//   * otherwise            -> ACTIVE
// `yearsLeft` / `monthsLeft` are rounded for display ("2 yrs left", "5 mo left").
const contractInfo = (end) => {
  if (!end) return { status: 'UNKNOWN', yearsLeft: null, monthsLeft: null };
  const endDate = new Date(end);
  const now = new Date();
  const msLeft = endDate.getTime() - now.getTime();
  const monthsLeft = Math.round(msLeft / (1000 * 60 * 60 * 24 * 30.44));
  const yearsLeft = msLeft / (1000 * 60 * 60 * 24 * 365.25);
  let status = 'ACTIVE';
  if (msLeft <= 0) status = 'EXPIRED';
  else if (monthsLeft <= 6) status = 'EXPIRING';
  return {
    status,
    yearsLeft: Math.max(0, Math.round(yearsLeft * 10) / 10),
    monthsLeft: Math.max(0, monthsLeft),
  };
};

const toPlayer = (r) => ({
  id: r.id,
  tenantId: r.tenant_id,
  teamId: r.team_id,
  firstName: r.first_name,
  lastName: r.last_name,
  dateOfBirth: r.date_of_birth,
  idNumber: r.id_number ?? null,
  email: r.email ?? null,
  userId: r.user_id ?? null,
  hasLogin: !!r.user_id,
  position: r.position,
  jerseyNumber: r.jersey_number,
  photoUrl: r.photo_url,
  clubLogoUrl: r.club_logo_url ?? null,
  isActive: r.is_active,
  // Age group comes from the player's team (e.g. U17, SENIOR).
  ageGroup: r.age_group ?? null,
  // Contract lifecycle.
  contractStart: r.contract_start ?? null,
  contractEnd: r.contract_end ?? null,
  contractRenewals: r.contract_renewals ?? 0,
  contractRenewedAt: r.contract_renewed_at ?? null,
  contract: contractInfo(r.contract_end),
});

export const listPlayers = asyncHandler(async (req, res) => {
  const { teamId } = req.query;
  // SYSTEM_ADMIN (null tenant) sees players across all clubs.
  const params = [req.tenantId];
  let sql = `SELECT p.*, c.logo_url AS club_logo_url, t.age_group
               FROM players p
               LEFT JOIN clubs c ON c.id = p.tenant_id
               LEFT JOIN teams t ON t.id = p.team_id
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
    `SELECT p.*, t.age_group
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
      WHERE p.id = $1 AND ($2::uuid IS NULL OR p.tenant_id = $2)`,
    [req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Player not found');
  res.json(toPlayer(rows[0]));
});

export const createPlayer = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    idNumber,
    email,
    teamId,
    dateOfBirth,
    position,
    jerseyNumber,
    photoUrl,
    contractStart,
    contractEnd,
    documents,
    guardian,
  } = req.body;

  // A player under 18 must have a guardian on record.
  const age = ageFromDob(dateOfBirth);
  const isMinor = age != null && age < 18;
  if (isMinor && !guardian) {
    throw ApiError.badRequest('Players under 18 must be registered with a guardian.');
  }

  const { rows } = await query(
    `INSERT INTO players
       (tenant_id, team_id, first_name, last_name, id_number, email, date_of_birth, position, jersey_number, photo_url, contract_start, contract_end)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      req.tenantId,
      teamId ?? null,
      firstName,
      lastName,
      idNumber ?? null,
      email ?? null,
      dateOfBirth ?? null,
      position ?? null,
      jerseyNumber ?? null,
      photoUrl ?? null,
      contractStart ?? null,
      contractEnd ?? null,
    ]
  );
  const player = rows[0];

  // Persist any documents uploaded during registration.
  if (Array.isArray(documents) && documents.length) {
    for (const doc of documents) {
      await query(
        `INSERT INTO player_documents (tenant_id, player_id, doc_type, file_name, file_data, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.tenantId,
          player.id,
          doc.docType ?? 'OTHER',
          doc.fileName ?? null,
          doc.fileData,
          req.user.id,
        ]
      );
    }
  }

  // Create/link the guardian and connect them to this player.
  if (guardian) {
    const guardianId = await ensureGuardian(req.tenantId, guardian);
    await query(
      `INSERT INTO guardian_players (tenant_id, guardian_id, player_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (guardian_id, player_id) DO NOTHING`,
      [req.tenantId, guardianId, player.id]
    );
  }

  res.status(201).json(toPlayer(player));
});

export const updatePlayer = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    idNumber,
    email,
    teamId,
    dateOfBirth,
    position,
    jerseyNumber,
    photoUrl,
    contractStart,
    contractEnd,
  } = req.body;
  const { rows } = await query(
    `UPDATE players
        SET first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            id_number = COALESCE($5, id_number),
            email = COALESCE($6, email),
            team_id = COALESCE($7, team_id),
            date_of_birth = COALESCE($8, date_of_birth),
            position = COALESCE($9, position),
            jersey_number = COALESCE($10, jersey_number),
            photo_url = COALESCE($11, photo_url),
            contract_start = COALESCE($12, contract_start),
            contract_end = COALESCE($13, contract_end)
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [
      req.params.id,
      req.tenantId,
      firstName,
      lastName,
      idNumber,
      email,
      teamId,
      dateOfBirth,
      position,
      jerseyNumber,
      photoUrl,
      contractStart,
      contractEnd,
    ]
  );
  if (!rows[0]) throw ApiError.notFound('Player not found');
  res.json(toPlayer(rows[0]));
});

// --- Player documents -------------------------------------------------

export const listPlayerDocuments = asyncHandler(async (req, res) => {
  // Authorize: club staff (any tenant member) or the player/guardian linked to it.
  const { rows } = await query(
    `SELECT id, doc_type, file_name, file_data, created_at
       FROM player_documents
      WHERE player_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC`,
    [req.params.id, req.tenantId]
  );
  res.json(
    rows.map((d) => ({
      id: d.id,
      docType: d.doc_type,
      fileName: d.file_name,
      fileData: d.file_data,
      createdAt: d.created_at,
    }))
  );
});

export const uploadPlayerDocument = asyncHandler(async (req, res) => {
  const { docType, fileName, fileData } = req.body;
  // Confirm the player belongs to this tenant.
  const exists = await query(
    `SELECT 1 FROM players WHERE id = $1 AND tenant_id = $2`,
    [req.params.id, req.tenantId]
  );
  if (!exists.rows[0]) throw ApiError.notFound('Player not found');

  const { rows } = await query(
    `INSERT INTO player_documents (tenant_id, player_id, doc_type, file_name, file_data, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, doc_type, file_name, created_at`,
    [req.tenantId, req.params.id, docType ?? 'OTHER', fileName ?? null, fileData, req.user.id]
  );
  res.status(201).json({
    id: rows[0].id,
    docType: rows[0].doc_type,
    fileName: rows[0].file_name,
    createdAt: rows[0].created_at,
  });
});

export const deletePlayerDocument = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `DELETE FROM player_documents
      WHERE id = $1 AND player_id = $2 AND tenant_id = $3 RETURNING id`,
    [req.params.docId, req.params.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('Document not found');
  res.json({ id: rows[0].id, deleted: true });
});

// Renew a player's contract: extend the end date and bump the renewal count.
// This is how a club records "the player signed an extension".
export const renewContract = asyncHandler(async (req, res) => {
  const { contractEnd, contractStart } = req.body;
  if (!contractEnd) throw ApiError.badRequest('contractEnd is required to renew a contract');
  const { rows } = await query(
    `UPDATE players
        SET contract_start = COALESCE($3, contract_start),
            contract_end = $4,
            contract_renewals = contract_renewals + 1,
            contract_renewed_at = now()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [req.params.id, req.tenantId, contractStart ?? null, contractEnd]
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
      contractStart: p.contract_start ?? null,
      contractEnd: p.contract_end ?? null,
      contractRenewals: p.contract_renewals ?? 0,
      contractRenewedAt: p.contract_renewed_at ?? null,
      contract: contractInfo(p.contract_end),
    },
    totals,
    averages,
    shotConversion,
    perMatch,
  });
});

// --- Player self-service portal --------------------------------------
// A PLAYER logs in and sees only their own linked player record.
export const getMyPlayer = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, t.age_group, t.name AS team_name, c.logo_url AS club_logo_url
       FROM players p
       LEFT JOIN teams t ON t.id = p.team_id
       LEFT JOIN clubs c ON c.id = p.tenant_id
      WHERE p.user_id = $1 AND p.tenant_id = $2`,
    [req.user.id, req.tenantId]
  );
  if (!rows[0]) throw ApiError.notFound('No player profile is linked to your account');
  res.json({ ...toPlayer(rows[0]), teamName: rows[0].team_name });
});
