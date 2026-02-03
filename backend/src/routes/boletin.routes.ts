import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware } from '../middleware/tenant.middleware';
import {
  getBoletinPlantillaHandler,
  getBoletinEstudianteHandler,
  getBoletinesClaseHandler,
  generarBoletinPersonalizadoHandler,
} from '../controllers/boletin.controller';
import {
  getBoletinDataHandler,
  getBoletinesClaseDataHandler,
} from '../controllers/boletin-data.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Plantilla vacía (cualquier usuario autenticado)
router.get('/plantilla/:grado', getBoletinPlantillaHandler);

// Boletín de estudiante específico (docentes, coordinadores, directores, admin)
router.get(
  '/estudiante/:estudianteId',
  roleMiddleware([Role.DOCENTE, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.DIRECTOR, Role.ADMIN]),
  resolveTenantMiddleware,
  getBoletinEstudianteHandler
);

// Boletines de toda una clase (docentes, coordinadores, directores, admin)
router.get(
  '/clase/:claseId',
  roleMiddleware([Role.DOCENTE, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.DIRECTOR, Role.ADMIN]),
  resolveTenantMiddleware,
  getBoletinesClaseHandler
);

// Generar boletín con datos personalizados (admin y directores)
router.post(
  '/generar',
  roleMiddleware([Role.DIRECTOR, Role.ADMIN]),
  generarBoletinPersonalizadoHandler
);

// ============================================
// ENDPOINTS DE DATOS (JSON para frontend)
// ============================================

// Datos estructurados de un estudiante para generar PDF en frontend
router.get(
  '/data/:estudianteId/:cicloId',
  roleMiddleware([Role.DOCENTE, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.DIRECTOR, Role.ADMIN]),
  resolveTenantMiddleware,
  getBoletinDataHandler
);

// Datos de boletines de toda una clase
router.get(
  '/data/clase/:claseId/:cicloId',
  roleMiddleware([Role.DOCENTE, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.DIRECTOR, Role.ADMIN]),
  resolveTenantMiddleware,
  getBoletinesClaseDataHandler
);

export default router;
