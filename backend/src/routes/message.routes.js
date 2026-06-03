import { Router } from 'express';
import { sendMessage, listMessages } from '../controllers/message.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { clubMessageSchema } from '../validation/schemas.js';

const router = Router();

// Coaches and club admins can message the club / a team / a call-up / custom list.
router.get('/', authorize('CLUB_ADMIN', 'COACH'), listMessages);
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(clubMessageSchema),
  sendMessage
);

export default router;
