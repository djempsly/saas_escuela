import { Router } from 'express';
import {
  crearEventoHandler,
  actualizarEventoHandler,
  eliminarEventoHandler,
  getEventosHandler,
  getEventoByIdHandler,
  getTiposEventoHandler,
  getFeriadosHandler,
} from '../controllers/evento.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Middleware común para todas las rutas
router.use(
  authMiddleware,
  resolveTenantMiddleware,
  requireTenantMiddleware
);

// Obtener tipos de evento
router.get('/tipos', getTiposEventoHandler);

// Obtener feriados
router.get('/feriados', getFeriadosHandler);

// Listar eventos (acceso por rol)
router.get('/', getEventosHandler);

// Obtener detalle de evento
router.get('/:id', getEventoByIdHandler);

// Crear evento (Director, Coordinador, Docente)
router.post(
  '/',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE]),
  crearEventoHandler
);

// Actualizar evento (creador o Director)
router.put(
  '/:id',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE]),
  actualizarEventoHandler
);

// Eliminar evento (creador o Director)
router.delete(
  '/:id',
  roleMiddleware([ROLES.DIRECTOR, ROLES.COORDINADOR, ROLES.COORDINADOR_ACADEMICO, ROLES.DOCENTE]),
  eliminarEventoHandler
);

export default router;
