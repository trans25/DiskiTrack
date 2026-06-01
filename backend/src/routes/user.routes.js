import { Router } from 'express';
import {
  listUsers,
  createUser,
  deactivateUser,
} from '../controllers/user.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { createUserSchema } from '../validation/schemas.js';

const router = Router();

router.get('/', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), listUsers);
router.post(
  '/',
  authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'),
  validateBody(createUserSchema),
  createUser
);
router.delete('/:id', authorize('SYSTEM_ADMIN', 'CLUB_ADMIN'), deactivateUser);

export default router;
