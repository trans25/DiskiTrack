import { Router } from 'express';
import { login, refresh, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../validation/schemas.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);

export default router;
