import { Router } from 'express';
import { registerSuperAdminHandler, loginHandler, forgotPasswordHandler, resetPasswordHandler } from '../controllers/auth.controller';

const router = Router();

router.post('/register-super-admin', registerSuperAdminHandler);
router.post('/login', loginHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);

export default router;
