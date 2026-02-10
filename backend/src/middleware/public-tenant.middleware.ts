import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { logger } from '../config/logger';

/**
 * Middleware público de resolución de tenant.
 *
 * Resuelve la institución por hostname SIN necesitar autenticación.
 * Se usa para el landing page público y la página de login.
 *
 * Flujo de resolución:
 * 1. Intenta resolver por subdominio (ej: politecnico.lhams.com)
 * 2. Intenta resolver por dominio personalizado verificado (ej: politecnicoolga.com)
 * 3. Si no encuentra, retorna 404
 *
 * Almacena el resultado en:
 * - req.tenantInstitucion: objeto completo de la institución
 * - req.resolvedInstitucionId: ID de la institución
 */
export const publicTenantResolver = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const host = req.hostname;
    const baseDomain = process.env.BASE_DOMAIN;

    // Si no hay BASE_DOMAIN configurado, este middleware no puede funcionar
    // en modo subdominio. Pasar al siguiente middleware.
    if (!baseDomain) {
      (req.log || logger).warn('BASE_DOMAIN no está definido, saltando resolución por subdominio');
    }

    let institucion = null;

    // 1. Intentar resolución por subdominio
    if (baseDomain && host.endsWith(`.${baseDomain}`)) {
      const slug = host.replace(`.${baseDomain}`, '');

      // Subdominios reservados que no son instituciones
      const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp', 'imap'];

      if (!reservedSubdomains.includes(slug)) {
        institucion = await prisma.institucion.findUnique({
          where: { slug, activo: true },
        });
      }
    }

    // 2. Intentar resolución por dominio personalizado verificado
    if (!institucion) {
      // Primero buscar en la tabla de dominios verificados
      const dominioRegistro = await prisma.institucionDominio.findUnique({
        where: { dominio: host, verificado: true },
        include: {
          institucion: true,
        },
      });

      if (dominioRegistro && dominioRegistro.institucion.activo) {
        institucion = dominioRegistro.institucion;
      }

      // Fallback: buscar por dominioPersonalizado directo (campo legacy)
      if (!institucion) {
        institucion = await prisma.institucion.findFirst({
          where: { dominioPersonalizado: host, activo: true },
        });
      }
    }

    // 3. Si no encontramos institución, dejar que la ruta decida qué hacer
    // Algunos endpoints públicos pueden funcionar sin institución
    if (!institucion) {
      // Solo retornar error si la ruta requiere institución
      // Las rutas que no la requieren pueden verificar !req.tenantInstitucion
      req.tenantInstitucion = null;
      req.resolvedInstitucionId = null;
      return next();
    }

    // Almacenar información del tenant en el request
    req.tenantInstitucion = institucion;
    req.resolvedInstitucionId = institucion.id;

    next();
  } catch (error) {
    (req.log || logger).error({ err: error }, 'Error resolviendo tenant público');
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Middleware que REQUIERE que se haya resuelto una institución pública.
 * Usar después de publicTenantResolver cuando la ruta NECESITA una institución.
 */
export const requirePublicTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenantInstitucion || !req.resolvedInstitucionId) {
    return res.status(404).json({
      error: 'Institución no encontrada para este dominio',
      hint: 'Verifica que el dominio esté configurado correctamente',
    });
  }
  next();
};
