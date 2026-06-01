import { Router } from 'express';
import {
  listPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  getPlayerStats,
  getPlayerProfile,
} from '../controllers/player.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { createPlayerSchema } from '../validation/schemas.js';

const router = Router();

router.get('/', listPlayers);
router.get('/:id', getPlayer);
router.get('/:id/stats', getPlayerStats);
router.get('/:id/profile', getPlayerProfile);
// SYSTEM_ADMIN is read-only on players (view all, no create/edit/delete).
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(createPlayerSchema),
  createPlayer
);
router.patch('/:id', authorize('CLUB_ADMIN', 'COACH'), updatePlayer);

export default router;
