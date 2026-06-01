import { Router } from 'express';
import { dashboardStats } from '../controllers/stats.controller.js';

const router = Router();

// Role-aware dashboard counts (platform-wide for SYSTEM_ADMIN, club-scoped otherwise).
router.get('/dashboard', dashboardStats);

export default router;
