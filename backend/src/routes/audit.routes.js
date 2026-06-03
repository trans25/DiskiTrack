import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import { listAuditLog } from '../controllers/audit.controller.js';

const router = Router();

// Audit trail is admin-only.
router.get('/', authorize('CLUB_ADMIN', 'SYSTEM_ADMIN'), listAuditLog);

export default router;
