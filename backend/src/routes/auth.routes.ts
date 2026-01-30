import { Router } from 'express';
import {
  registerSuperAdminHandler,
  loginHandler,
  forgotPasswordHandler,
  resetPasswordHandler
} from '../controllers/auth.controller';
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerLimiter
} from '../middleware/rateLimit.middleware';

const router = Router();

// Registro de SuperAdmin - muy limitado (solo para setup inicial)
router.post('/register-super-admin', registerLimiter, registerSuperAdminHandler);

// Login - limitado para prevenir fuerza bruta
router.post('/login', loginLimiter, loginHandler);

// Forgot password - limitado para prevenir abuso
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);

// Reset password - limitado
router.post('/reset-password', resetPasswordLimiter, resetPasswordHandler);

export default router;
