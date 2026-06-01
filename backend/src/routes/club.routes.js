import { Router } from 'express';
import {
  listClubs,
  getClub,
  createClub,
  updateClub,
  deleteClub,
} from '../controllers/club.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { createClubSchema } from '../validation/schemas.js';

// Mounted behind authenticate + tenantIsolation in app.js
const router = Router();

router.get('/', authorize('SYSTEM_ADMIN'), listClubs);
router.post('/', authorize('SYSTEM_ADMIN'), validateBody(createClubSchema), createClub);
router.get('/:id', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), getClub);
router.patch('/:id', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), updateClub);
router.delete('/:id', authorize('SYSTEM_ADMIN'), deleteClub);

export default router;
