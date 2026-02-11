import { Router } from 'express';
import {
  crearTareaHandler,
  actualizarTareaHandler,
  eliminarTareaHandler,
  getTareasHandler,
  getTareaByIdHandler,
  agregarRecursoHandler,
  entregarTareaHandler,
  calificarEntregaHandler,
  getEntregasTareaHandler,
} from '../controllers/tarea.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Middleware común para todas las rutas
router.use(authMiddleware, resolveTenantMiddleware, requireTenantMiddleware);

// Listar tareas (acceso por rol)
router.get('/', getTareasHandler);

// Obtener detalle de tarea
router.get('/:id', getTareaByIdHandler);

// Crear tarea (solo docente)
router.post('/', roleMiddleware([ROLES.DOCENTE]), crearTareaHandler);

// Actualizar tarea (solo docente)
router.put('/:id', roleMiddleware([ROLES.DOCENTE]), actualizarTareaHandler);

// Eliminar tarea (solo docente)
router.delete('/:id', roleMiddleware([ROLES.DOCENTE]), eliminarTareaHandler);

// Agregar recurso a tarea (solo docente)
router.post('/:id/recursos', roleMiddleware([ROLES.DOCENTE]), agregarRecursoHandler);

// Obtener entregas de una tarea (solo docente)
router.get('/:id/entregas', roleMiddleware([ROLES.DOCENTE]), getEntregasTareaHandler);

// Entregar tarea (solo estudiante)
router.post('/:id/entregar', roleMiddleware([ROLES.ESTUDIANTE]), entregarTareaHandler);

// Calificar entrega (solo docente)
router.put(
  '/:id/entregas/:entregaId/calificar',
  roleMiddleware([ROLES.DOCENTE]),
  calificarEntregaHandler,
);

export default router;
