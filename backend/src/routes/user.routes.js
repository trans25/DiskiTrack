import { Router } from 'express';
import {
  listUsers,
  createUser,
  inviteUser,
  resendInvite,
  deactivateUser,
} from '../controllers/user.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema, inviteUserSchema } from '../validation/schemas.js';

const router = Router();

router.get('/', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), listUsers);
router.post(
  '/',
  authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'),
  validateBody(createUserSchema),
  createUser
);
router.post(
  '/invite',
  authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'),
  validateBody(inviteUserSchema),
  inviteUser
);
router.post(
  '/:id/resend-invite',
  authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'),
  resendInvite
);
router.delete('/:id', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), deactivateUser);

export default router;
