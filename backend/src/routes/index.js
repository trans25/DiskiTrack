import { Router } from 'express';
import authRoutes from './auth.routes.js';
import clubRoutes from './club.routes.js';
import userRoutes from './user.routes.js';
import teamRoutes from './team.routes.js';
import playerRoutes from './player.routes.js';
import matchRoutes from './match.routes.js';
import analyticsRoutes from './analytics.routes.js';
import guardianRoutes from './guardian.routes.js';
import statsRoutes from './stats.routes.js';
import announcementRoutes from './announcement.routes.js';
import trainingRoutes from './training.routes.js';
import coachRoutes from './coach.routes.js';
import standingsRoutes from './standings.routes.js';
import reviewRoutes from './review.routes.js';
import { authenticate } from '../middleware/authenticate.js';
import { tenantIsolation } from '../middleware/tenantIsolation.js';

const router = Router();

// Public
router.use('/auth', authRoutes);
router.use('/reviews', reviewRoutes);

// Everything below requires a valid JWT and a resolved tenant context.
router.use(authenticate, tenantIsolation);

router.use('/clubs', clubRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/matches', matchRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/guardians', guardianRoutes);
router.use('/stats', statsRoutes);
router.use('/announcements', announcementRoutes);
router.use('/training', trainingRoutes);
router.use('/coach', coachRoutes);
router.use('/standings', standingsRoutes);

export default router;
