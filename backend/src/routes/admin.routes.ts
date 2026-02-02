import { Router } from 'express';
import {
  getAllUsersGlobalHandler,
  getUserStatsHandler,
  createDirectorHandler,
  getAllDirectoresHandler,
  reassignDirectorHandler,
  getDirectorHistoryHandler,
  forceResetPasswordHandler,
} from '../controllers/admin.controller';
import {
  getSystemSettingsHandler,
  updateSystemSettingsHandler,
} from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Todas las rutas de admin requieren autenticación y rol ADMIN
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN]));

// ===== USUARIOS =====
// GET /api/v1/admin/usuarios - Lista todos los usuarios (con filtros)
router.get('/usuarios', getAllUsersGlobalHandler);

// GET /api/v1/admin/usuarios/stats - Estadísticas globales
router.get('/usuarios/stats', getUserStatsHandler);

// POST /api/v1/admin/usuarios/:id/force-reset - Reset forzado de password
router.post('/usuarios/:id/force-reset', forceResetPasswordHandler);

// ===== DIRECTORES =====
// GET /api/v1/admin/directores - Listar todos los directores
router.get('/directores', getAllDirectoresHandler);

// POST /api/v1/admin/directores - Crear director con password temporal
router.post('/directores', createDirectorHandler);

// PUT /api/v1/admin/directores/:id/reasignar - Reasignar director a otra institución
router.put('/directores/:id/reasignar', reassignDirectorHandler);

// ===== INSTITUCIONES (historial) =====
// GET /api/v1/admin/instituciones/:id/historial - Ver historial de directores
router.get('/instituciones/:id/historial', getDirectorHistoryHandler);

// ===== CONFIGURACION DEL SISTEMA =====
// GET /api/v1/admin/settings - Obtener configuración
router.get('/settings', getSystemSettingsHandler);

// PUT /api/v1/admin/settings - Actualizar configuración
router.put('/settings', updateSystemSettingsHandler);

export default router;
