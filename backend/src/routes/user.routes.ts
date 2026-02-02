import { Router } from 'express';
import {
  createUserHandler,
  resetUserPasswordManualHandler,
  getAllUsersHandler,
  getStaffHandler,
  getUserByIdHandler,
  updateProfileHandler,
  updateUserHandler,
  uploadPhotoHandler
} from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { ROLES } from '../utils/zod.schemas';
import { upload as uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// Get all users (for institution) - Director, Coordinador, Secretaria can see users
router.get(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.SECRETARIA]),
  getAllUsersHandler
);

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

// Get staff (personal) - Director can see their registered staff (MUST come before /:id)
router.get(
  '/staff',
  authMiddleware,
  roleMiddleware([ROLES.DIRECTOR]),
  getStaffHandler
);

// Get user by ID
router.get(
  '/:id',
  authMiddleware,
  getUserByIdHandler
);

// Only a DIRECTOR can create users (Docente, Estudiante)
router.post(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.DIRECTOR]),
  createUserHandler
);

// Update user by ID (Director, Admin)
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  updateUserHandler
);

// Manual Password Reset (Admin, Director, Secretaria)
router.post(
  '/:id/reset-password',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SECRETARIA]),
  resetUserPasswordManualHandler
);

export default router;
