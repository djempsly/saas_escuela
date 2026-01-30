import { Router } from 'express';
import {
  createActividadHandler,
  getActividadesHandler,
  getActividadByIdHandler,
  updateActividadHandler,
  deleteActividadHandler,
  searchActividadesHandler,
} from '../controllers/actividad.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { uploadActividad } from '../middleware/upload.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Rutas públicas (para landing page)
router.get('/', getActividadesHandler);
router.get('/search', searchActividadesHandler);
router.get('/:id', getActividadByIdHandler);

// Rutas protegidas - Solo ADMIN puede crear/editar/eliminar actividades
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN]));

// Crear actividad con archivos opcionales
router.post('/', uploadActividad, createActividadHandler);

// Actualizar actividad
router.put('/:id', uploadActividad, updateActividadHandler);

// Eliminar actividad
router.delete('/:id', deleteActividadHandler);

export default router;
