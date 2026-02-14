/**
 * Rutas para Sábana de Notas
 */

import { Router } from 'express';
import {
  getNivelesHandler,
  getCiclosLectivosHandler,
  getSabanaHandler,
  updateCalificacionHandler,
  publicarCalificacionesHandler,
  exportarExcelHandler,
} from '../controllers/sabana.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /sabana/niveles - Obtener niveles disponibles
// Accesible por: DIRECTOR, COORDINADOR, COORDINADOR_ACADEMICO, DOCENTE
router.get(
  '/niveles',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE, ROLES.ESTUDIANTE, ROLES.PSICOLOGO]),
  getNivelesHandler,
);

// GET /sabana/ciclos-lectivos - Obtener ciclos lectivos activos
router.get(
  '/ciclos-lectivos',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE, ROLES.ESTUDIANTE, ROLES.PSICOLOGO]),
  getCiclosLectivosHandler,
);

// PATCH /sabana/publicar - Publicar calificaciones de una clase
// DIRECTOR, COORDINADOR, COORDINADOR_ACADEMICO, DOCENTE
router.patch(
  '/publicar',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE]),
  publicarCalificacionesHandler,
);

// GET /sabana/:nivelId/:cicloLectivoId/exportar-excel - Exportar a Excel (background job)
router.get(
  '/:nivelId/:cicloLectivoId/exportar-excel',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE]),
  exportarExcelHandler,
);

// GET /sabana/:nivelId/:cicloLectivoId - Obtener sábana de notas
// DIRECTOR: puede ver todo
// COORDINADOR: solo niveles de su ciclo educativo
// DOCENTE: solo niveles donde tiene clases (verificado en el servicio)
router.get(
  '/:nivelId/:cicloLectivoId',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE, ROLES.ESTUDIANTE, ROLES.PSICOLOGO]),
  getSabanaHandler,
);

// PATCH /sabana/calificacion - Actualizar calificación
// DIRECTOR: puede editar cualquier calificación
// DOCENTE: solo sus propias clases (verificado en el servicio)
router.patch(
  '/calificacion',
  roleMiddleware([ROLES.DIRECTOR, ROLES.DOCENTE]),
  updateCalificacionHandler,
);

export default router;
