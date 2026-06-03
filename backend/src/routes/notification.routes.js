import { Router } from 'express';
import {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notification.controller.js';

const router = Router();

// All notification routes are scoped to the authenticated user (req.user.id),
// so any signed-in role may use them.
router.get('/', listNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
