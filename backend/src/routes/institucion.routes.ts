import { Router } from 'express';
import {
  createInstitucionHandler,
  findInstitucionesHandler,
  findInstitucionByIdHandler,
  updateInstitucionHandler,
  deleteInstitucionHandler,
} from '../controllers/institucion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Proteger todas las rutas de instituciones
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN]));

router.post('/', createInstitucionHandler);
router.get('/', findInstitucionesHandler);
router.get('/:id', findInstitucionByIdHandler);
router.put('/:id', updateInstitucionHandler);
router.delete('/:id', deleteInstitucionHandler);

export default router;
