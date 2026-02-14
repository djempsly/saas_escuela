import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { parsePlanFeatures } from '../utils/plan-features';

/**
 * Middleware que verifica los límites de imágenes y videos por actividad
 * según el plan de suscripción de la institución.
 *
 * Debe colocarse DESPUÉS de multer (uploadActividad) y DESPUÉS de resolveTenantMiddleware.
 */
export const checkLimiteArchivosMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // ADMIN no tiene restricciones
  if (req.user?.rol === Role.ADMIN) {
    return next();
  }

  // Solo aplica a POST y PUT (crear/editar actividades)
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return next();
  }

  const institucionId = req.resolvedInstitucionId || req.body.institucionId;
  if (!institucionId) {
    // Actividad global (sin institución) — sin límites
    return next();
  }

  // Obtener plan de la institución
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { institucionId },
    include: { plan: { select: { features: true } } },
  });

  if (!suscripcion) {
    return next();
  }

  const features = parsePlanFeatures(suscripcion.plan.features);

  // Contar imágenes totales (subidas + URLs + existentes)
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  let totalImagenes = 0;
  let totalVideos = 0;

  // Archivos subidos
  if (files) {
    totalImagenes += files.imagenes?.length ?? 0;
    totalVideos += files.video?.length ?? 0;
  }

  // URLs de imágenes
  if (req.body.fotosUrls) {
    try {
      const urls = JSON.parse(req.body.fotosUrls);
      if (Array.isArray(urls)) {
        totalImagenes += urls.filter((u: string) => u && u.trim()).length;
      }
    } catch {
      if (typeof req.body.fotosUrls === 'string') {
        totalImagenes += req.body.fotosUrls.split(',').filter((u: string) => u.trim()).length;
      }
    }
  }

  // URL de video
  if (req.body.videoUrl && req.body.videoUrl.trim()) {
    totalVideos += 1;
  }

  // Imágenes/videos existentes (en update)
  if (req.body.fotosExistentes) {
    try {
      const existentes = JSON.parse(req.body.fotosExistentes);
      if (Array.isArray(existentes)) {
        totalImagenes += existentes.length;
      }
    } catch { /* ignorar */ }
  }

  if (req.body.videosExistentes) {
    try {
      const existentes = JSON.parse(req.body.videosExistentes);
      if (Array.isArray(existentes)) {
        totalVideos += existentes.length;
      }
    } catch { /* ignorar */ }
  }

  // Verificar límites
  if (totalImagenes > features.maxImagenesActividad) {
    return res.status(403).json({
      message: `Tu plan permite un máximo de ${features.maxImagenesActividad} imágenes por actividad. Tienes ${totalImagenes}.`,
    });
  }

  if (totalVideos > features.maxVideosActividad) {
    if (features.maxVideosActividad === 0) {
      return res.status(403).json({
        message: 'Tu plan no incluye videos en actividades. Actualiza tu plan para agregar videos.',
      });
    }
    return res.status(403).json({
      message: `Tu plan permite un máximo de ${features.maxVideosActividad} videos por actividad. Tienes ${totalVideos}.`,
    });
  }

  return next();
};
