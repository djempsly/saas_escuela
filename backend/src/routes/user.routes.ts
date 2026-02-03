import { Router } from 'express';
import {
  createUserHandler,
  resetUserPasswordManualHandler,
  getAllUsersHandler,
  getStaffHandler,
  getUserByIdHandler,
  updateProfileHandler,
  updateUserHandler,
  uploadPhotoHandler,
  getCoordinadoresHandler,
  getCoordinacionInfoHandler,
  assignCiclosHandler,
  assignNivelesHandler,
} from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';
import { upload as uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// ============ RUTAS QUE NO REQUIEREN TENANT ============

// Update own profile - any authenticated user (MUST come before /:id)
router.put(
  '/profile',
  authMiddleware,
  uploadMiddleware.single('foto'),
  updateProfileHandler
);

// Upload profile photo - any authenticated user (MUST come before /:id)
router.post(
  '/upload-photo',
  authMiddleware,
  uploadMiddleware.single('foto'),
  uploadPhotoHandler
);

// ============ RUTAS QUE REQUIEREN TENANT ============

// Get all users (for institution) - Director, Coordinador, Secretaria can see users
router.get(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.SECRETARIA]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getAllUsersHandler
);

// Get staff (personal) - Director can see their registered staff (MUST come before /:id)
router.get(
  '/staff',
  authMiddleware,
  roleMiddleware([ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getStaffHandler
);

// Get coordinadores - Director can see coordinators (MUST come before /:id)
router.get(
  '/coordinadores',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getCoordinadoresHandler
);

// Get coordinacion info for a user (MUST come before /:id)
router.get(
  '/coordinadores/:id/info',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  getCoordinacionInfoHandler
);

// Assign ciclos educativos to coordinator
router.post(
  '/coordinadores/:id/ciclos',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  assignCiclosHandler
);

// Assign niveles to coordinator
router.post(
  '/coordinadores/:id/niveles',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  assignNivelesHandler
);

// Get user by ID
router.get(
  '/:id',
  authMiddleware,
  resolveTenantMiddleware,
  getUserByIdHandler
);

// Only a DIRECTOR or ADMIN can create users (Docente, Estudiante)
router.post(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  createUserHandler
);

// Update user by ID (Director, Admin)
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  updateUserHandler
);

// Manual Password Reset (Admin, Director, Secretaria)
router.post(
  '/:id/reset-password',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SECRETARIA]),
  resolveTenantMiddleware,
  resetUserPasswordManualHandler
);

export default router;
