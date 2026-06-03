import { Router } from 'express';
import {
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  getPlayerStats,
  getPlayerProfile,
  renewContract,
  listPlayerDocuments,
  uploadPlayerDocument,
  deletePlayerDocument,
  getMyPlayer,
} from '../controllers/player.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { enforcePlanLimit } from '../middleware/planLimit.js';
import {
  createPlayerSchema,
  renewContractSchema,
  playerDocumentSchema,
} from '../validation/schemas.js';

const router = Router();

// Player self-service portal — the logged-in player's own record.
router.get('/me', authorize('PLAYER'), getMyPlayer);

router.get('/', listPlayers);
router.get('/:id', getPlayer);
router.get('/:id/stats', getPlayerStats);
router.get('/:id/profile', getPlayerProfile);

// Player documents (ID copy, registration form, medical, consent forms).
router.get('/:id/documents', listPlayerDocuments);
router.post(
  '/:id/documents',
  authorize('CLUB_ADMIN', 'COACH', 'GUARDIAN', 'PLAYER'),
  validateBody(playerDocumentSchema),
  uploadPlayerDocument
);
router.delete(
  '/:id/documents/:docId',
  authorize('CLUB_ADMIN', 'COACH'),
  deletePlayerDocument
);

// SYSTEM_ADMIN is read-only on players (view all, no create/edit/delete).
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  enforcePlanLimit('players'),
  validateBody(createPlayerSchema),
  createPlayer
);
router.patch('/:id', authorize('CLUB_ADMIN', 'COACH'), updatePlayer);
// Record a contract renewal (extension). Club admins handle contracts.
router.post(
  '/:id/renew',
  authorize('CLUB_ADMIN'),
  validateBody(renewContractSchema),
  renewContract
);

export default router;
