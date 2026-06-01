import { Router } from 'express';
import {
  topScorers,
  teamPerformance,
  matchReport,
  clubAnalytics,
  platformAnalytics,
  coachPerformance,
} from '../controllers/analytics.controller.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/top-scorers', topScorers);
router.get('/teams/:teamId/performance', teamPerformance);
router.get('/matches/:matchId/report', matchReport);

// Club-wide analytics bundle (clubs' staff only).
router.get('/club', authorize('CLUB_ADMIN', 'COACH', 'ANALYST'), clubAnalytics);

// Cross-tenant platform analytics (super user only).
router.get('/platform', authorize('SYSTEM_ADMIN'), platformAnalytics);

// Coach performance across their own teams.
router.get('/coach/performance', authorize('COACH'), coachPerformance);

export default router;
