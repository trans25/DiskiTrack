import { Router } from 'express';
import {
  listTrainingSessions,
  createTrainingSession,
  updateTrainingSession,
  deleteTrainingSession,
  getTrainingAttendance,
  saveTrainingAttendance,
} from '../controllers/training.controller.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import {
  createTrainingSessionSchema,
  updateTrainingSessionSchema,
  saveAttendanceSchema,
} from '../validation/schemas.js';

const router = Router();

// Anyone in the club can view training; only COACH / CLUB_ADMIN manage it.
router.get('/', listTrainingSessions);
router.post(
  '/',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(createTrainingSessionSchema),
  createTrainingSession
);
router.patch(
  '/:id',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(updateTrainingSessionSchema),
  updateTrainingSession
);
router.delete('/:id', authorize('CLUB_ADMIN', 'COACH'), deleteTrainingSession);

router.get('/:id/attendance', getTrainingAttendance);
router.put(
  '/:id/attendance',
  authorize('CLUB_ADMIN', 'COACH'),
  validateBody(saveAttendanceSchema),
  saveTrainingAttendance
);

export default router;
