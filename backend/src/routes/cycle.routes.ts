import { Router } from 'express';
import {
  createCicloHandler,
  getCiclosHandler,
  getCicloByIdHandler,
  updateCicloHandler,
  deleteCicloHandler,
} from '../controllers/cycle.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Middlewares base para todas las rutas
router.use(authMiddleware, resolveTenantMiddleware, requireTenantMiddleware);

// Rutas de lectura - todos los roles de staff pueden ver ciclos
router.get(
  '/',
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
    ROLES.SECRETARIA,
  ]),
  getCiclosHandler,
);
router.get(
  '/:id',
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
    ROLES.SECRETARIA,
  ]),
  getCicloByIdHandler,
);

// Rutas de escritura - solo ADMIN y DIRECTOR
router.post('/', roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]), createCicloHandler);
router.put('/:id', roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]), updateCicloHandler);
router.delete('/:id', roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]), deleteCicloHandler);

export default router;
