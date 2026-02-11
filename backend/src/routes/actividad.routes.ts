import { Router } from 'express';
import {
  createActividadHandler,
  getActividadesHandler,
  getActividadesAdminHandler,
  getActividadByIdHandler,
  updateActividadHandler,
  deleteActividadHandler,
  searchActividadesHandler,
  getActividadesBySlugHandler,
  getActividadesByInstitucionHandler,
} from '../controllers/actividad.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware } from '../middleware/tenant.middleware';
import { uploadActividad } from '../middleware/upload.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// ===== RUTAS PÚBLICAS (para landing pages) =====

// Obtener actividades globales (landing principal)
router.get('/', getActividadesHandler);

// Buscar actividades
router.get('/search', searchActividadesHandler);

// Obtener actividades por slug de institución (landing dinámica)
router.get('/institucion/:slug', getActividadesBySlugHandler);

// Obtener actividades por ID de institución
router.get('/institucion-id/:id', getActividadesByInstitucionHandler);

// Listar todas las actividades para admin (DEBE ir antes de /:id)
router.get(
  '/admin',
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  getActividadesAdminHandler,
);

// Obtener actividad por ID
router.get('/:id', getActividadByIdHandler);

// ===== RUTAS PROTEGIDAS =====
// ADMIN puede crear/editar/eliminar cualquier actividad
// DIRECTOR puede crear actividades SI su institución tiene autogestionActividades = true
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]), resolveTenantMiddleware);

// Crear actividad con archivos opcionales
router.post('/', uploadActividad, createActividadHandler);

// Actualizar actividad
router.put('/:id', uploadActividad, updateActividadHandler);

// Eliminar actividad
router.delete('/:id', deleteActividadHandler);

export default router;
