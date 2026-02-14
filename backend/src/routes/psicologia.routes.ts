import { Router } from 'express';
import {
  getEstudiantesNotasBajasHandler,
  getObservacionesHandler,
  crearObservacionHandler,
  eliminarObservacionHandler,
} from '../controllers/psicologia.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

router.use(
  authMiddleware,
  roleMiddleware([ROLES.PSICOLOGO, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
);

// Estudiantes con notas bajas
router.get('/notas-bajas', getEstudiantesNotasBajasHandler);

// Observaciones psicológicas
router.get('/observaciones/:estudianteId', getObservacionesHandler);
router.post('/observaciones', crearObservacionHandler);
router.delete('/observaciones/:id', eliminarObservacionHandler);

export default router;
