import { Router } from 'express';
import {
  topScorers,
  teamPerformance,
  matchReport,
} from '../controllers/analytics.controller.js';

const router = Router();

router.get('/top-scorers', topScorers);
router.get('/teams/:teamId/performance', teamPerformance);
router.get('/matches/:matchId/report', matchReport);

export default router;
