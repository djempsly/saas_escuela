import { Router } from 'express';
import {
  registerSuperAdminHandler,
  loginHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  manualResetPasswordHandler,
} from '../controllers/auth.controller';
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerLimiter,
  changePasswordLimiter,
} from '../middleware/rateLimit.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Registro de SuperAdmin - muy limitado (solo para setup inicial)
router.post('/register-super-admin', registerLimiter, registerSuperAdminHandler);

// Login - limitado para prevenir fuerza bruta
router.post('/login', loginLimiter, loginHandler);

// Forgot password - limitado para prevenir abuso
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);

// Reset password - limitado
router.post('/reset-password', resetPasswordLimiter, resetPasswordHandler);

// Change password - requiere autenticación
router.post('/change-password', authMiddleware, changePasswordLimiter, changePasswordHandler);

// Manual reset password - requiere autenticación (ADMIN/DIRECTOR)
router.post(
  '/manual-reset-password',
  authMiddleware,
  changePasswordLimiter,
  manualResetPasswordHandler,
);

export default router;
