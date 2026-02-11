import { Router } from 'express';
import {
  createInstitucionHandler,
  findInstitucionesHandler,
  findInstitucionByIdHandler,
  updateInstitucionHandler,
  deleteInstitucionHandler,
  getBrandingHandler,
  updateConfigHandler,
  updateDirectorConfigHandler,
  getBrandingBySlugHandler,
  getBrandingByDominioHandler,
  updateSensitiveConfigHandler,
  checkSlugHandler,
  checkDominioHandler,
  updateSistemasEducativosHandler,
  uploadFaviconHandler,
  uploadHeroHandler,
  uploadLoginLogoHandler,
} from '../controllers/institucion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  uploadInstitucionMedia,
  uploadFavicon,
  uploadHero,
  uploadLoginLogo,
} from '../middleware/upload.middleware';
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

// ===== RUTA PROTEGIDA - DIRECTOR (config visual limitada) =====
router.patch(
  '/:id/config-director',
  authMiddleware,
  roleMiddleware([ROLES.DIRECTOR]),
  updateDirectorConfigHandler,
);

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

// Subir favicon de institución
router.post('/:id/favicon', uploadFavicon, uploadFaviconHandler);

// Subir imagen hero de institución
router.post('/:id/hero', uploadHero, uploadHeroHandler);

// Subir logo de login de institución
router.post('/:id/login-logo', uploadLoginLogo, uploadLoginLogoHandler);

export default router;
