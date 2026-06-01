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
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  venue: z.string().max(200).optional(),
  scheduledAt: z.string(),
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(matchStatuses),
});

export const updateMatchSchema = z.object({
  venue: z.string().max(200).optional(),
  scheduledAt: z.string().optional(),
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
});

export const createMatchEventSchema = z.object({
  teamId: z.string().uuid(),
  eventType: z.enum(eventTypes),
  playerId: z.string().uuid().optional(),
  relatedPlayerId: z.string().uuid().optional(),
  minute: z.coerce.number().int().min(0).max(130).optional(),
  notes: z.string().max(500).optional(),
});

export const assignGuardianPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
});
