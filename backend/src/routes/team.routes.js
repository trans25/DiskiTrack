import { Router } from 'express';
import {
  listTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamOverview,
} from '../controllers/team.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { enforcePlanLimit } from '../middleware/planLimit.js';
import { createTeamSchema } from '../validation/schemas.js';

const router = Router();

router.get('/', listTeams);
router.get('/:id', getTeam);
router.get('/:id/overview', getTeamOverview);
router.post(
  '/',
  authorize('CLUB_ADMIN'),
  enforcePlanLimit('teams'),
  validateBody(createTeamSchema),
  createTeam
);
router.patch('/:id', authorize('CLUB_ADMIN', 'COACH'), updateTeam);
router.delete('/:id', authorize('CLUB_ADMIN'), deleteTeam);

export default router;
