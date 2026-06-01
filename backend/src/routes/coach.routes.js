import { Router } from 'express';
import { coachOverview } from '../controllers/coach.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Coach home overview: their teams, fixtures and training at a glance.
router.get('/overview', authorize('COACH'), coachOverview);

export default router;
