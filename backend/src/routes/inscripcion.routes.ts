import { Router } from 'express';
import {
  inscribirEstudianteHandler,
  inscribirPorCodigoHandler,
  getInscripcionesByClaseHandler,
  getMisInscripcionesHandler,
  getInscripcionesByEstudianteHandler,
  eliminarInscripcionHandler,
  inscribirMasivoHandler,
} from '../controllers/inscripcion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { inscripcionByUserLimiter } from '../middleware/rateLimit.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Ruta para que estudiantes se auto-inscriban por código (rate limit por userId)
router.post(
  '/por-codigo',
  authMiddleware,
  roleMiddleware([ROLES.ESTUDIANTE]),
  inscripcionByUserLimiter,
  inscribirPorCodigoHandler,
);

// Ruta para que estudiantes vean sus inscripciones
router.get(
  '/mis-clases',
  authMiddleware,
  roleMiddleware([ROLES.ESTUDIANTE]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
  getMisInscripcionesHandler,
);

// Rutas protegidas para administración y docentes
router.use(
  authMiddleware,
  roleMiddleware([
    ROLES.ADMIN,
    ROLES.DIRECTOR,
    ROLES.COORDINADOR,
    ROLES.COORDINADOR_ACADEMICO,
    ROLES.DOCENTE,
    ROLES.SECRETARIA,
  ]),
  resolveTenantMiddleware,
  requireTenantMiddleware,
);

// Inscribir estudiante (admin/director/coordinador/secretaria)
router.post('/', inscribirEstudianteHandler);

// Inscripción masiva
router.post('/masivo', inscribirMasivoHandler);

// Ver inscripciones por clase
router.get('/clase/:claseId', getInscripcionesByClaseHandler);

// Ver inscripciones por estudiante
router.get('/estudiante/:estudianteId', getInscripcionesByEstudianteHandler);

// Eliminar inscripción
router.delete('/:id', eliminarInscripcionHandler);

export default router;
