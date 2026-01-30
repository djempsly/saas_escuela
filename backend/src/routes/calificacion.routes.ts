import { Router } from 'express';
import {
  guardarCalificacionHandler,
  guardarCalificacionTecnicaHandler,
  getCalificacionesClaseHandler,
  getCalificacionesEstudianteHandler,
  getMisCalificacionesHandler,
  getBoletinHandler,
  getMiBoletinHandler,
  guardarCalificacionesMasivasHandler,
} from '../controllers/calificacion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Rutas para estudiantes (ver sus propias calificaciones)
router.get(
  '/mis-calificaciones',
  authMiddleware,
  roleMiddleware([ROLES.ESTUDIANTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getMisCalificacionesHandler
);

router.get(
  '/mi-boletin/:cicloLectivoId',
  authMiddleware,
  roleMiddleware([ROLES.ESTUDIANTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getMiBoletinHandler
);

// Rutas protegidas para docentes y administrativos
router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.DOCENTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware
);

// Guardar calificación general
router.post('/', guardarCalificacionHandler);

// Guardar calificación técnica (RA) - Solo Politécnico
router.post('/tecnica', guardarCalificacionTecnicaHandler);

// Guardar calificaciones masivas (por periodo)
router.post('/masivo', guardarCalificacionesMasivasHandler);

// Obtener calificaciones de una clase
router.get('/clase/:claseId', getCalificacionesClaseHandler);

// Obtener calificaciones de un estudiante
router.get('/estudiante/:estudianteId', getCalificacionesEstudianteHandler);

// Obtener boletín de un estudiante
router.get('/boletin/:estudianteId/:cicloLectivoId', getBoletinHandler);

export default router;
