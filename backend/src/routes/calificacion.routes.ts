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
  getMisCalificacionesHandler,
);

router.get(
  '/mi-boletin/:cicloLectivoId',
  authMiddleware,
  roleMiddleware([ROLES.ESTUDIANTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getMiBoletinHandler,
);

// ============================================
// RUTAS DE ESCRITURA - Solo DOCENTE puede editar notas
// ============================================
router.post(
  '/',
  authMiddleware,
  roleMiddleware([ROLES.DOCENTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  guardarCalificacionHandler,
);

router.post(
  '/tecnica',
  authMiddleware,
  roleMiddleware([ROLES.DOCENTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  guardarCalificacionTecnicaHandler,
);

router.post(
  '/masivo',
  authMiddleware,
  roleMiddleware([ROLES.DOCENTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  guardarCalificacionesMasivasHandler,
);

// ============================================
// RUTAS DE LECTURA - Docentes, coordinadores, directores pueden ver
// ============================================
router.get(
  '/clase/:claseId',
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
  ]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getCalificacionesClaseHandler,
);

router.get(
  '/estudiante/:estudianteId',
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
  ]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getCalificacionesEstudianteHandler,
);

router.get(
  '/boletin/:estudianteId/:cicloLectivoId',
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
  ]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getBoletinHandler,
);

export default router;
