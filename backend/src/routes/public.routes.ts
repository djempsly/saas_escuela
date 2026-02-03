import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { publicTenantResolver, requirePublicTenant } from '../middleware/public-tenant.middleware';

const router = Router();

/**
 * GET /api/public/landing
 *
 * Retorna todo lo que el landing page necesita:
 * - Información de la institución
 * - Configuración de branding
 * - Actividades públicas recientes
 *
 * Requiere que se resuelva la institución por hostname.
 */
router.get(
  '/landing',
  publicTenantResolver,
  requirePublicTenant,
  async (req: Request, res: Response) => {
    try {
      const inst = req.tenantInstitucion!;

      // Cargar actividades públicas de esta institución
      const actividades = await prisma.actividad.findMany({
        where: {
          institucionId: inst.id,
          publicado: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        select: {
          id: true,
          titulo: true,
          contenido: true,
          urlArchivo: true,
          fotos: true,
          tipoMedia: true,
          createdAt: true,
        },
      });

      res.json({
        institucion: {
          id: inst.id,
          nombre: inst.nombreMostrar || inst.nombre,
          lema: inst.lema,
          slug: inst.slug,
        },
        branding: {
          logoUrl: inst.logoUrl,
          logoWidth: inst.logoWidth || 120,
          logoHeight: inst.logoHeight || 60,
          logoPosicion: inst.logoPosicion || 'center',
          faviconUrl: inst.faviconUrl,
          colorPrimario: inst.colorPrimario || '#1a56db',
          colorSecundario: inst.colorSecundario || '#7c3aed',
          accentColor: inst.accentColor || '#059669',
          heroImageUrl: inst.heroImageUrl,
          heroTitle: inst.heroTitle || inst.nombre,
          heroSubtitle: inst.heroSubtitle || 'Bienvenidos a nuestra plataforma educativa',
        },
        login: {
          loginBgType: inst.loginBgType || 'color',
          loginBgColor: inst.loginBgColor || '#f3f4f6',
          loginBgImage: inst.fondoLoginUrl,
          loginBgGradient: inst.loginBgGradient,
          loginLogoUrl: inst.loginLogoUrl || inst.logoUrl,
        },
        actividades: actividades.map((a) => ({
          id: a.id,
          titulo: a.titulo,
          contenido: a.contenido?.substring(0, 200) + (a.contenido && a.contenido.length > 200 ? '...' : ''),
          imagenUrl: a.urlArchivo || (Array.isArray(a.fotos) && a.fotos.length > 0 ? a.fotos[0] : null),
          tipoMedia: a.tipoMedia,
          fechaPublicacion: a.createdAt,
        })),
      });
    } catch (error) {
      console.error('[PUBLIC] Error en /landing:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * GET /api/public/actividades/:id
 *
 * Retorna el detalle completo de una actividad pública.
 */
router.get(
  '/actividades/:id',
  publicTenantResolver,
  requirePublicTenant,
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const inst = req.tenantInstitucion!;
      const actividadId = req.params.id;

      const actividad = await prisma.actividad.findFirst({
        where: {
          id: actividadId,
          institucionId: inst.id,
          publicado: true,
        },
        include: {
          autor: {
            select: { nombre: true, apellido: true },
          },
        },
      });

      if (!actividad) {
        return res.status(404).json({ error: 'Actividad no encontrada' });
      }

      res.json({
        id: actividad.id,
        titulo: actividad.titulo,
        contenido: actividad.contenido,
        imagenUrl: actividad.urlArchivo,
        fotos: actividad.fotos,
        videos: actividad.videos,
        tipoMedia: actividad.tipoMedia,
        autor: `${actividad.autor.nombre} ${actividad.autor.apellido}`,
        fechaPublicacion: actividad.createdAt,
      });
    } catch (error) {
      console.error('[PUBLIC] Error en /actividades/:id:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

/**
 * GET /api/public/branding
 *
 * Retorna solo la configuración de branding (para precargar estilos).
 */
router.get(
  '/branding',
  publicTenantResolver,
  requirePublicTenant,
  async (req: Request, res: Response) => {
    const inst = req.tenantInstitucion!;

    res.json({
      nombre: inst.nombreMostrar || inst.nombre,
      logoUrl: inst.logoUrl,
      logoWidth: inst.logoWidth || 120,
      logoHeight: inst.logoHeight || 60,
      faviconUrl: inst.faviconUrl,
      colorPrimario: inst.colorPrimario || '#1a56db',
      colorSecundario: inst.colorSecundario || '#7c3aed',
      accentColor: inst.accentColor || '#059669',
    });
  }
);

/**
 * GET /api/public/health
 *
 * Health check para la institución pública.
 */
router.get('/health', publicTenantResolver, (req: Request, res: Response) => {
  if (req.tenantInstitucion) {
    res.json({
      status: 'ok',
      institucion: req.tenantInstitucion.nombre,
      slug: req.tenantInstitucion.slug,
    });
  } else {
    res.json({
      status: 'ok',
      institucion: null,
      message: 'No se pudo resolver institución por hostname',
    });
  }
});

export default router;
