import { Router } from 'express';
import {
  listPublishedReviews,
  createReview,
  listAllReviews,
  setReviewPublished,
  deleteReview,
} from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import { createReviewSchema } from '../validation/schemas.js';

// Reviews are public: anyone can read published testimonials or submit one.
// Moderation endpoints below are guarded individually because this router is
// mounted on the public side of the API (before the global auth middleware).
const router = Router();

router.get('/', listPublishedReviews);
router.post('/', validateBody(createReviewSchema), createReview);

router.get('/all', authenticate, authorize('SYSTEM_ADMIN'), listAllReviews);
router.patch('/:id/publish', authenticate, authorize('SYSTEM_ADMIN'), setReviewPublished);
router.delete('/:id', authenticate, authorize('SYSTEM_ADMIN'), deleteReview);

export default router;
