import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import {
  listPlans,
  getMySubscription,
  subscribe,
  cancelSubscription,
  listInvoices,
} from '../controllers/billing.controller.js';

const router = Router();

// Any authenticated user can view the plan catalogue.
router.get('/plans', listPlans);

// Subscription management is a club-admin concern.
router.get('/subscription', authorize('CLUB_ADMIN', 'SYSTEM_ADMIN'), getMySubscription);
router.post('/subscribe', authorize('CLUB_ADMIN'), subscribe);
router.post('/cancel', authorize('CLUB_ADMIN'), cancelSubscription);
router.get('/invoices', authorize('CLUB_ADMIN', 'SYSTEM_ADMIN'), listInvoices);

export default router;
