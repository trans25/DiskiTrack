import { Router } from 'express';
import {
  login,
  refresh,
  me,
  registerClub,
  forgotPassword,
  resetPassword,
  verifyToken,
  guardianIdLogin,
  guestLogin,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import {
  loginSchema,
  registerClubSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  guardianLoginSchema,
} from '../validation/schemas.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/guardian-login', validateBody(guardianLoginSchema), guardianIdLogin);
router.post('/guest-login', guestLogin);
router.post('/register', validateBody(registerClubSchema), registerClub);
router.post('/refresh', refresh);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
router.get('/verify-token', verifyToken);
router.get('/me', authenticate, me);

export default router;
