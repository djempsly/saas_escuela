import { Router } from 'express';
import {
  createInstitucionHandler,
  findInstitucionesHandler,
  findInstitucionByIdHandler,
  updateInstitucionHandler,
  deleteInstitucionHandler,
  getBrandingHandler,
  updateConfigHandler,
  getBrandingBySlugHandler,
  getBrandingByDominioHandler,
  updateSensitiveConfigHandler,
  checkSlugHandler,
  checkDominioHandler,
  updateSistemasEducativosHandler,
} from '../controllers/institucion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { uploadInstitucionMedia } from '../middleware/upload.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// ===== RUTAS PÚBLICAS (sin autenticación) =====

// Obtener branding por ID (para login y landing)
router.get('/:id/branding', getBrandingHandler);

// Obtener branding por slug (para landing dinámica por URL interna)
router.get('/slug/:slug/branding', getBrandingBySlugHandler);

// Obtener branding por dominio personalizado (para landing dinámica por dominio externo)
router.get('/dominio/:dominio/branding', getBrandingByDominioHandler);

// Verificar disponibilidad de slug (para formulario de creación)
router.get('/check-slug/:slug', checkSlugHandler);

// Verificar disponibilidad de dominio (para formulario de creación)
router.get('/check-dominio/:dominio', checkDominioHandler);

// ===== RUTAS PROTEGIDAS - Solo ADMIN =====
router.use(authMiddleware, roleMiddleware([ROLES.ADMIN]));

router.post('/', createInstitucionHandler);
router.get('/', findInstitucionesHandler);
router.get('/:id', findInstitucionByIdHandler);
router.put('/:id', updateInstitucionHandler);
router.delete('/:id', deleteInstitucionHandler);

// Actualizar configuración de branding (con upload de logo y fondo de login opcional)
router.patch('/:id/config', uploadInstitucionMedia, updateConfigHandler);

// Actualizar configuración sensible (nombre, slug, dominio, activo, autogestion)
router.patch('/:id/sensitive', updateSensitiveConfigHandler);

// Actualizar sistemas educativos que ofrece la institución
router.patch('/:id/sistemas-educativos', updateSistemasEducativosHandler);

export default router;
