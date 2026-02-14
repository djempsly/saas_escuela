import { Router } from 'express';
import {
  createClaseHandler,
  getClasesHandler,
  getClaseByIdHandler,
  getClaseByCodigoHandler,
  updateClaseHandler,
  deleteClaseHandler,
} from '../controllers/clase.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Ruta pública para buscar clase por código (para inscripción)
router.get('/codigo/:codigo', getClaseByCodigoHandler);

// Rutas protegidas - todos los roles pueden ver clases (incluyendo estudiantes)
router.use(
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
    ROLES.SECRETARIA,
    ROLES.ESTUDIANTE,
    ROLES.DIGITADOR,
  ]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
);

// CRUD - Solo ADMIN, DIRECTOR y COORDINADOR pueden crear/editar/eliminar
router.post(
  '/',
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.DIGITADOR]),
  createClaseHandler,
);
router.get('/', getClasesHandler);
router.get('/:id', getClaseByIdHandler);
router.put(
  '/:id',
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.DIGITADOR]),
  updateClaseHandler,
);
router.delete('/:id', roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]), deleteClaseHandler);

export default router;
