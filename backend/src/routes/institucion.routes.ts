import { Router } from 'express';
import {
  createInstitucionHandler,
  findInstitucionesHandler,
  findInstitucionByIdHandler,
  updateInstitucionHandler,
  deleteInstitucionHandler,
  getBrandingHandler,
  updateConfigHandler,
} from '../controllers/institucion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { uploadLogo } from '../middleware/upload.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Ruta pública para obtener branding de institución (para login y landing)
router.get('/:id/branding', getBrandingHandler);

// Proteger rutas de instituciones - Solo ADMIN
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN]));

router.post('/', createInstitucionHandler);
router.get('/', findInstitucionesHandler);
router.get('/:id', findInstitucionByIdHandler);
router.put('/:id', updateInstitucionHandler);
router.delete('/:id', deleteInstitucionHandler);

// Actualizar configuración de branding (con upload de logo opcional)
router.patch('/:id/config', uploadLogo, updateConfigHandler);

export default router;
