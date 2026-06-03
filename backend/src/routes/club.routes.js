import { Router } from 'express';
import {
  listClubs,
  getClub,
  createClub,
  updateClub,
  deleteClub,
  listPendingClubs,
  getClubProof,
  approveClub,
  rejectClub,
  notifyClubApproved,
} from '../controllers/club.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { createClubSchema, rejectClubSchema } from '../validation/schemas.js';

// Mounted behind authenticate + tenantIsolation in app.js
const router = Router();

router.get('/', authorize('SYSTEM_ADMIN'), listClubs);
router.post('/', authorize('SYSTEM_ADMIN'), validateBody(createClubSchema), createClub);

// Approval workflow — declared before '/:id' so the literal paths win.
router.get('/pending', authorize('SYSTEM_ADMIN'), listPendingClubs);
router.get('/:id/proof', authorize('SYSTEM_ADMIN'), getClubProof);
router.post('/:id/approve', authorize('SYSTEM_ADMIN'), approveClub);
router.post('/:id/reject', authorize('SYSTEM_ADMIN'), validateBody(rejectClubSchema), rejectClub);
router.post('/:id/notify-approved', authorize('SYSTEM_ADMIN'), notifyClubApproved);

router.get('/:id', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), getClub);
router.patch('/:id', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), updateClub);
router.delete('/:id', authorize('SYSTEM_ADMIN'), deleteClub);

export default router;
