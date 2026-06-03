import { z } from 'zod';

export const ageGroups = ['U13', 'U14', 'U15', 'U16', 'U17', 'U19', 'SENIOR'];
export const categories = ['BOYS', 'GIRLS', 'MEN', 'WOMEN'];
export const roles = ['SYSTEM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ANALYST', 'GUARDIAN'];
export const matchStatuses = ['SCHEDULED', 'LIVE', 'FINISHED'];
export const eventTypes = [
  'GOAL',
  'ASSIST',
  'SHOT',
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
  logoUrl: z.string().url().optional(),
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
  teamId: z.string().uuid().optional(),
  dateOfBirth: z.string().optional(),
  position: z.string().max(40).optional(),
  jerseyNumber: z.coerce.number().int().min(0).max(99).optional(),
  photoUrl: z.string().url().optional(),
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
