import { Router } from 'express';
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcement.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from '../validation/schemas.js';

const router = Router();

router.get('/', listAnnouncements);
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(createAnnouncementSchema),
  createAnnouncement
);
router.patch(
  '/:id',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(updateAnnouncementSchema),
  updateAnnouncement
);
router.delete('/:id', authorize('CLUB_ADMIN', 'COACH'), deleteAnnouncement);

export default router;
