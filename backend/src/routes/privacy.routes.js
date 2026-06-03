import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import {
  recordConsent,
  listMyConsent,
  exportMyData,
  createDataRequest,
  listMyDataRequests,
  listDataRequests,
  resolveDataRequest,
} from '../controllers/privacy.controller.js';

const router = Router();

// Self-service (any authenticated user).
router.post('/consent', recordConsent);
router.get('/consent', listMyConsent);
router.get('/export', exportMyData);
router.post('/requests', createDataRequest);
router.get('/requests/me', listMyDataRequests);

// Admin review of data requests.
router.get('/requests', authorize('CLUB_ADMIN', 'SYSTEM_ADMIN'), listDataRequests);
router.patch('/requests/:id', authorize('CLUB_ADMIN', 'SYSTEM_ADMIN'), resolveDataRequest);

export default router;
