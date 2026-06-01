import { Router } from 'express';
import {
  assignPlayers,
  myPlayers,
  myPlayerMatches,
} from '../controllers/guardian.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { assignGuardianPlayersSchema } from '../validation/schemas.js';

const router = Router();

// Club admin links players to a guardian.
router.post(
  '/:guardianId/players',
  authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'),
  validateBody(assignGuardianPlayersSchema),
  assignPlayers
);

// Guardian portal (self-service, scoped to assigned players only).
router.get('/me/players', authorize('GUARDIAN'), myPlayers);
router.get('/me/players/:playerId/matches', authorize('GUARDIAN'), myPlayerMatches);

export default router;
