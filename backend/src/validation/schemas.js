import { z } from 'zod';

export const ageGroups = [
  'U7', 'U8', 'U9', 'U10', 'U11', 'U12',
  'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'U23',
  'SENIOR', 'RESERVE',
];
export const categories = ['BOYS', 'GIRLS', 'MEN', 'WOMEN'];
export const roles = ['SYSTEM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN'];
export const matchStatuses = ['SCHEDULED', 'LIVE', 'FINISHED'];
export const eventTypes = [
  'GOAL',
  'ASSIST',
  'SHOT',
  'SHOT_ON_TARGET',
  'SAVE',
  'TACKLE',
  'INTERCEPTION',
  'OFFSIDE',
  'PENALTY_GOAL',
  'OWN_GOAL',
  'FOUL',
  'CORNER',
  'YELLOW_CARD',
  'RED_CARD',
  'SUBSTITUTION',
];

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerClubSchema = z.object({
  clubName: z.string().min(2).max(160),
  country: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  // base64 data URI of the proof document (e.g. "data:application/pdf;base64,...").
  proofDocument: z.string().min(1).max(8_000_000),
  proofFilename: z.string().max(255).optional(),
});

export const rejectClubSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6).max(100),
  purpose: z.enum(['RESET', 'INVITE']).optional(),
});

export const createClubSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().min(2).max(160).regex(/^[a-z0-9-]+$/),
  country: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  // Logo is optional. Accept either an uploaded image (base64 data URI) or a URL.
  logoUrl: z.string().max(8_000_000).optional().or(z.literal('')),
  admin: z
    .object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
    })
    .optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  role: z.enum(['CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN']),
});

// Invite a member: no password — they set their own via the emailed link.
export const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  role: z.enum(['CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN']),
});

export const createTeamSchema = z.object({
  name: z.string().min(2).max(160),
  ageGroup: z.enum(ageGroups),
  category: z.enum(categories),
  coachId: z.string().uuid().optional(),
});

export const createPlayerSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  // Identity & contact — a club registers a player against an ID and a valid email.
  idNumber: z.string().min(4).max(40),
  email: z.string().email(),
  teamId: z.string().uuid().optional(),
  dateOfBirth: z.string().optional(),
  position: z.string().max(40).optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional(),
  photoUrl: z.string().max(8_000_000).optional().or(z.literal('')),
  contractStart: z.string().optional(),
  contractEnd: z.string().optional(),
  // Optional documents uploaded at registration time.
  documents: z
    .array(
      z.object({
        docType: z.string().max(40).optional(),
        fileName: z.string().max(255).optional(),
        fileData: z.string().min(1).max(8_000_000),
      })
    )
    .optional(),
  // Guardian — REQUIRED for players under 18 (enforced in the controller).
  guardian: z
    .object({
      firstName: z.string().min(1).max(120),
      lastName: z.string().min(1).max(120),
      email: z.string().email(),
      phone: z.string().max(40).optional(),
      relationship: z.string().max(60).optional(),
    })
    .optional(),
});

// Guardian sign-in: enter the child's ID number, validated against the club DB.
export const guardianLoginSchema = z.object({
  idNumber: z.string().min(4).max(40),
});

// Renewing a contract requires the new end date; start is optional.
export const renewContractSchema = z.object({
  contractStart: z.string().optional(),
  contractEnd: z.string().min(1),
});

// Upload a single player document (base64 data URI).
export const playerDocumentSchema = z.object({
  docType: z.string().max(40).optional(),
  fileName: z.string().max(255).optional(),
  fileData: z.string().min(1).max(8_000_000),
});

// Coach / club admin messaging.
export const clubMessageSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  audience: z.enum(['ALL', 'TEAM', 'CALLUP', 'CUSTOM']),
  teamId: z.string().uuid().optional(),
  matchId: z.string().uuid().optional(),
  // For CUSTOM audiences: explicit recipient user ids and/or raw emails.
  recipientUserIds: z.array(z.string().uuid()).optional(),
  recipientEmails: z.array(z.string().email()).optional(),
});

// Set the travelling squad (call-up) for a fixture, then alert them by email.
export const matchCallupSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
  notify: z.boolean().optional(),
});

export const createMatchSchema = z.object({
  homeTeamId: z.string().uuid().optional(),
  awayTeamId: z.string().uuid().optional(),
  homeTeamLabel: z.string().min(1).max(200).optional(),
  awayTeamLabel: z.string().min(1).max(200).optional(),
  venue: z.string().max(200).optional(),
  scheduledAt: z.string(),
  videoUrl: z.string().url().max(1000).optional().or(z.literal('')),
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(matchStatuses),
});

export const updateMatchSchema = z.object({
  venue: z.string().max(200).optional(),
  scheduledAt: z.string().optional(),
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
  videoUrl: z.string().url().max(1000).nullable().optional().or(z.literal('')),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(5000),
  isPinned: z.boolean().optional(),
  teamId: z.string().uuid().nullable().optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
  teamId: z.string().uuid().nullable().optional(),
});

export const createMatchEventSchema = z.object({
  teamId: z.string().uuid(),
  eventType: z.enum(eventTypes),
  playerId: z.string().uuid().optional(),
  relatedPlayerId: z.string().uuid().optional(),
  minute: z.coerce.number().int().min(0).max(130).optional(),
  videoSeconds: z.coerce.number().int().min(0).max(86400).optional(),
  notes: z.string().max(500).optional(),
});

export const assignGuardianPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
});

export const saveLineupSchema = z.object({
  teamId: z.string().uuid(),
  formation: z.string().max(20).optional(),
  players: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        isStarting: z.boolean().optional(),
        jerseyNumber: z.coerce.number().int().min(0).max(99).nullable().optional(),
        position: z.string().max(40).nullable().optional(),
      })
    )
    .max(40),
});

export const attendanceStatuses = ['PRESENT', 'ABSENT', 'EXCUSED', 'INJURED', 'UNKNOWN'];

export const createTrainingSessionSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().min(2).max(200),
  location: z.string().max(200).optional(),
  focus: z.string().max(2000).optional(),
  scheduledAt: z.string().min(1),
  durationMin: z.coerce.number().int().min(0).max(600).optional(),
});

export const updateTrainingSessionSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  location: z.string().max(200).optional(),
  focus: z.string().max(2000).optional(),
  scheduledAt: z.string().min(1).optional(),
  durationMin: z.coerce.number().int().min(0).max(600).optional(),
});

export const saveAttendanceSchema = z.object({
  entries: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        status: z.enum(attendanceStatuses).optional(),
        note: z.string().max(200).nullable().optional(),
      })
    )
    .max(60),
});

export const createReviewSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().max(120).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(3).max(1000),
});
