import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  getBoletinPlantillaHandler,
  getBoletinEstudianteHandler,
  getBoletinesClaseHandler,
  generarBoletinPersonalizadoHandler,
} from '../controllers/boletin.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Plantilla vacía (cualquier usuario autenticado)
router.get('/plantilla/:grado', getBoletinPlantillaHandler);

// Boletín de estudiante específico (docentes, coordinadores, directores, admin)
router.get(
  '/estudiante/:estudianteId',
  roleMiddleware([Role.DOCENTE, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.DIRECTOR, Role.ADMIN]),
  getBoletinEstudianteHandler
);

// Boletines de toda una clase (docentes, coordinadores, directores, admin)
router.get(
  '/clase/:claseId',
  roleMiddleware([Role.DOCENTE, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.DIRECTOR, Role.ADMIN]),
  getBoletinesClaseHandler
);

// Generar boletín con datos personalizados (admin y directores)
router.post(
  '/generar',
  roleMiddleware([Role.DIRECTOR, Role.ADMIN]),
  generarBoletinPersonalizadoHandler
);

export default router;
