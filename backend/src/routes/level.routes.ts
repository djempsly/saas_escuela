import { Router } from 'express';
import {
  createNivelHandler,
  getNivelesHandler,
  getNivelByIdHandler,
  updateNivelHandler,
  deleteNivelHandler,
} from '../controllers/level.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Aplicar middlewares en orden:
// 1. authMiddleware - verifica JWT
// 2. roleMiddleware - verifica roles permitidos
// 3. resolveTenantMiddleware - resuelve institucionId (ADMIN puede usar query param)
// 4. requireTenantMiddleware - asegura que hay un institucionId resuelto
router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware
);

router.post('/', createNivelHandler);
router.get('/', getNivelesHandler);
router.get('/:id', getNivelByIdHandler);
router.put('/:id', updateNivelHandler);
router.delete('/:id', deleteNivelHandler);

export default router;
