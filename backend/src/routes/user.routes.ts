import { Router } from 'express';
import { createUserHandler, resetUserPasswordManualHandler } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Only a DIRECTOR can create users (Docente, Estudiante)
router.post(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.DIRECTOR]),
  createUserHandler
);

// Manual Password Reset (Admin, Director, Secretaria)
router.post(
    '/:id/reset-password',
    authMiddleware,
    // Assuming ROLES object in zod.schemas might not have SECRETARIA yet if it wasn't added previously.
    // Based on previous reads, ROLES has ADMIN, DIRECTOR, DOCENTE, ESTUDIANTE.
    // I should check if SECRETARIA is in ROLES.
    // The prompt says "roles: ADMIN, DIRECTOR, SECRETARIA".
    // I will add SECRETARIA to ROLES in zod.schemas first to be safe, or just use string literal if dynamic.
    // But roleMiddleware expects keys of ROLES.
    roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SECRETARIA]),
    resetUserPasswordManualHandler
);

export default router;
