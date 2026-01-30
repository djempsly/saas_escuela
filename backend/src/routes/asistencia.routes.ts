import { Router } from 'express';
import {
  tomarAsistenciaHandler,
  getAsistenciaByFechaHandler,
  getReporteClaseHandler,
  getReporteEstudianteHandler,
  getFechasAsistenciaHandler,
  getMiAsistenciaHandler,
} from '../controllers/asistencia.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Ruta para que estudiantes vean su propia asistencia
router.get(
  '/mi-asistencia',
  authMiddleware,
  roleMiddleware([ROLES.ESTUDIANTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getMiAsistenciaHandler
);

// Rutas protegidas para docentes y administrativos
router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.DOCENTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware
);

// Tomar asistencia
router.post('/tomar', tomarAsistenciaHandler);

// Obtener asistencia de una clase en una fecha específica
router.get('/clase/:claseId', getAsistenciaByFechaHandler);

// Obtener fechas donde se tomó asistencia
router.get('/clase/:claseId/fechas', getFechasAsistenciaHandler);

// Reporte de asistencia por clase (rango de fechas)
router.get('/reporte/clase', getReporteClaseHandler);

// Reporte de asistencia por estudiante
router.get('/reporte/estudiante/:estudianteId', getReporteEstudianteHandler);

export default router;
