import { Router } from 'express';
import {
  registerSuperAdminHandler,
  loginHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  manualResetPasswordHandler,
  refreshTokenHandler,
  logoutHandler,
} from '../controllers/auth.controller';
import {
  loginLimiter,
  loginByIdentifierLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  registerLimiter,
  changePasswordLimiter,
  changePasswordByUserLimiter,
} from '../middleware/rateLimit.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Registro de SuperAdmin - muy limitado (solo para setup inicial)
router.post('/register-super-admin', registerLimiter, registerSuperAdminHandler);

// Login - limitado por IP + por identificador (doble capa)
router.post('/login', loginLimiter, loginByIdentifierLimiter, loginHandler);

// Forgot password - limitado para prevenir abuso
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordHandler);

// Reset password - limitado
router.post('/reset-password', resetPasswordLimiter, resetPasswordHandler);

// Change password - requiere autenticación, limitado por IP + por userId
router.post('/change-password', authMiddleware, changePasswordLimiter, changePasswordByUserLimiter, changePasswordHandler);

// Manual reset password - requiere autenticación (ADMIN/DIRECTOR)
router.post(
  '/manual-reset-password',
  authMiddleware,
  changePasswordLimiter,
  manualResetPasswordHandler,
);

// Refresh token - rota el refresh token y emite nuevo access token
router.post('/refresh', loginLimiter, refreshTokenHandler);

// Logout - invalida el refresh token
router.post('/logout', authMiddleware, logoutHandler);

export default router;
