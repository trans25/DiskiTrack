import { query } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  sendClubMessageEmail,
  sendCallupEmail,
} from '../utils/mailer.js';
import { notifyTenant } from '../utils/notify.js';
import { recordAudit } from '../utils/audit.js';

// Collect a de-duplicated set of {email, name} recipients within the tenant.
// We pull from BOTH user accounts (staff, guardians, players with logins) and
// player contact emails so everyone intended actually receives the message.
const collectRecipients = async (tenantId, { audience, teamId, matchId, recipientUserIds, recipientEmails }) => {
  const map = new Map(); // email -> name

  const add = (email, name) => {
    if (!email) return;
    const key = email.trim().toLowerCase();
    if (!map.has(key)) map.set(key, name || '');
  };

  if (audience === 'ALL') {
    const users = await query(
      `SELECT email, first_name FROM users
        WHERE tenant_id = $1 AND is_active = TRUE`,
      [tenantId]
    );
    users.rows.forEach((u) => add(u.email, u.first_name));

    const players = await query(
      `SELECT email, first_name FROM players
        WHERE tenant_id = $1 AND email IS NOT NULL`,
      [tenantId]
    );
    players.rows.forEach((p) => add(p.email, p.first_name));
  } else if (audience === 'TEAM') {
    if (!teamId) throw ApiError.badRequest('teamId is required for a team message');
    const players = await query(
      `SELECT email, first_name FROM players
        WHERE tenant_id = $1 AND team_id = $2 AND email IS NOT NULL`,
      [tenantId, teamId]
    );
    players.rows.forEach((p) => add(p.email, p.first_name));
    // Include the team's coach.
    const coach = await query(
      `SELECT u.email, u.first_name FROM teams t
         JOIN users u ON u.id = t.coach_id
        WHERE t.id = $1 AND t.tenant_id = $2`,
      [teamId, tenantId]
    );
    coach.rows.forEach((c) => add(c.email, c.first_name));
  } else if (audience === 'CALLUP') {
    if (!matchId) throw ApiError.badRequest('matchId is required for a call-up message');
    const players = await query(
      `SELECT p.email, p.first_name FROM match_callups mc
         JOIN players p ON p.id = mc.player_id
        WHERE mc.match_id = $1 AND mc.tenant_id = $2 AND p.email IS NOT NULL`,
      [matchId, tenantId]
    );
    players.rows.forEach((p) => add(p.email, p.first_name));
  } else {
    // CUSTOM: explicit user ids and/or raw emails.
    if (Array.isArray(recipientUserIds) && recipientUserIds.length) {
      const users = await query(
        `SELECT email, first_name FROM users
          WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, recipientUserIds]
      );
      users.rows.forEach((u) => add(u.email, u.first_name));
    }
    if (Array.isArray(recipientEmails)) {
      recipientEmails.forEach((e) => add(e, ''));
    }
  }

  return [...map.entries()].map(([email, name]) => ({ email, name }));
};

// COACH / CLUB_ADMIN — send a message (and email everyone intended).
export const sendMessage = asyncHandler(async (req, res) => {
  const { subject, body, audience, teamId, matchId, recipientUserIds, recipientEmails } = req.body;

  const recipients = await collectRecipients(req.tenantId, {
    audience,
    teamId,
    matchId,
    recipientUserIds,
    recipientEmails,
  });

  if (!recipients.length) {
    throw ApiError.badRequest('No recipients with a valid email were found for this message');
  }

  const club = await query(`SELECT name FROM clubs WHERE id = $1`, [req.tenantId]);
  const clubName = club.rows[0]?.name || 'Your club';
  const senderName = `${req.user.firstName ?? ''} ${req.user.lastName ?? ''}`.trim() || clubName;

  // Fire the emails (best-effort; a single failure shouldn't abort the batch).
  let delivered = 0;
  for (const r of recipients) {
    try {
      const result = await sendClubMessageEmail({
        to: r.email,
        recipientName: r.name,
        clubName,
        subject,
        body,
        senderName,
      });
      if (result?.delivered) delivered += 1;
    } catch (err) {
      console.error(`[messages] failed to email ${r.email}: ${err.message}`);
    }
  }

  // Log the message.
  await query(
    `INSERT INTO club_messages (tenant_id, sender_id, subject, body, audience, team_id, match_id, recipient_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      req.tenantId,
      req.user.id,
      subject,
      body,
      audience,
      teamId ?? null,
      matchId ?? null,
      recipients.length,
    ]
  );

  // Also surface the message in the in-app notification centre for users that
  // have an account in the tenant.
  notifyTenant({
    tenantId: req.tenantId,
    type: 'MESSAGE',
    title: subject,
    body: `New message from ${senderName}`,
    link: '/announcements',
  });

  recordAudit({
    req,
    action: 'MESSAGE_SENT',
    entityType: 'club_message',
    summary: `Sent "${subject}" to ${recipients.length} recipient(s)`,
    metadata: { audience, recipients: recipients.length },
  });

  res.status(201).json({
    sent: true,
    recipients: recipients.length,
    delivered,
  });
});

// History of messages sent within the club.
export const listMessages = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT cm.id, cm.subject, cm.body, cm.audience, cm.recipient_count, cm.created_at,
            u.first_name AS sender_first, u.last_name AS sender_last,
            t.name AS team_name
       FROM club_messages cm
       LEFT JOIN users u ON u.id = cm.sender_id
       LEFT JOIN teams t ON t.id = cm.team_id
      WHERE cm.tenant_id = $1
      ORDER BY cm.created_at DESC
      LIMIT 100`,
    [req.tenantId]
  );
  res.json(
    rows.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      audience: m.audience,
      recipientCount: m.recipient_count,
      createdAt: m.created_at,
      sender: `${m.sender_first ?? ''} ${m.sender_last ?? ''}`.trim() || 'Club',
      teamName: m.team_name ?? null,
    }))
  );
});
