import { Router } from 'express';
import {
  createCicloEducativoHandler,
  getCiclosEducativosHandler,
  getCicloEducativoByIdHandler,
  updateCicloEducativoHandler,
  deleteCicloEducativoHandler,
  assignNivelesHandler,
  assignCoordinadoresHandler,
  generarEstructuraHandler,
} from '../controllers/cicloEducativo.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Apply middlewares
router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINADOR_ACADEMICO]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
);

// Generate academic structure (must be before /:id)
router.post('/generar-estructura', generarEstructuraHandler);

// CRUD routes
router.post('/', createCicloEducativoHandler);
router.get('/', getCiclosEducativosHandler);
router.get('/:id', getCicloEducativoByIdHandler);
router.put('/:id', updateCicloEducativoHandler);
router.delete('/:id', deleteCicloEducativoHandler);

// Assignment routes
router.post('/:id/niveles', assignNivelesHandler);
router.post('/:id/coordinadores', assignCoordinadoresHandler);

export default router;
