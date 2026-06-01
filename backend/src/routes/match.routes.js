import { Router } from 'express';
import {
  listMatches,
  getMatch,
  createMatch,
  updateMatchStatus,
  updateMatch,
  deleteMatch,
} from '../controllers/match.controller.js';
import {
  listMatchEvents,
  createMatchEvent,
  deleteMatchEvent,
} from '../controllers/matchEvent.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import {
  createMatchSchema,
  updateMatchStatusSchema,
  updateMatchSchema,
  createMatchEventSchema,
} from '../validation/schemas.js';

const router = Router();

router.get('/', listMatches);
router.get('/:id', getMatch);
// SYSTEM_ADMIN is read-only on matches and events
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(createMatchSchema),
  createMatch
);
router.patch(
  '/:id/status',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(updateMatchStatusSchema),
  updateMatchStatus
);
router.patch(
  '/:id',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(updateMatchSchema),
  updateMatch
);
router.delete('/:id', authorize('CLUB_ADMIN'), deleteMatch);

//Live match events
router.get('/:matchId/events', listMatchEvents);
router.post(
  '/:matchId/events',
  authorize('CLUB_ADMIN', 'COACH', 'ANALYST'),
  validateBody(createMatchEventSchema),
  createMatchEvent
);
router.delete(
  '/:matchId/events/:eventId',
  authorize('CLUB_ADMIN', 'COACH'),
  deleteMatchEvent
);

export default router;
