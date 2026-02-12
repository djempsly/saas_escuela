import { Request, Response } from 'express';
import { Idioma, SistemaEducativo } from '@prisma/client';
import prisma from '../../config/db';
import {
  getInstitucionBranding,
  updateInstitucionConfig,
  getInstitucionBrandingBySlug,
  getInstitucionBrandingByDominio,
  updateSensitiveConfig,
  checkSlugAvailability,
  checkDominioAvailability,
  updateSistemasEducativos,
} from '../../services/institucion';
import { uploadToS3, deleteFromS3, isS3Url } from '../../services/s3.service';
import { sanitizeErrorMessage } from '../../utils/security';
import { getErrorMessage, isZodError } from '../../utils/error-helpers';
import { z } from 'zod';

// Obtener branding de una institución (público)
export const getBrandingHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const branding = await getInstitucionBranding(id);
    if (!branding) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }
    return res.status(200).json(branding);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// Actualizar configuración de branding (Solo ADMIN)
export const updateConfigHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Schema de validación para config (todos opcionales para multipart)
    const configSchema = z.object({
      colorPrimario: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      colorSecundario: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      lema: z.string().max(200).optional().nullable(),
      direccion: z.string().max(300).optional(),
      codigoCentro: z.string().max(50).optional(),
      distritoEducativo: z.string().max(100).optional(),
      regionalEducacion: z.string().max(100).optional(),
      sabanaColores: z.string().optional(),
    });

    const validated = configSchema.parse(req.body);

    // Obtener URLs de archivos subidos
    let logoUrl: string | undefined;
    let fondoLoginUrl: string | undefined;

    // Obtener datos actuales para borrar archivos anteriores de S3
    const existing = await prisma.institucion.findUnique({
      where: { id },
      select: { logoUrl: true, fondoLoginUrl: true },
    });

    // Manejar múltiples archivos (cuando se usa upload.fields())
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    if (files && typeof files === 'object') {
      if (files.logo && files.logo[0]) {
        if (existing?.logoUrl && isS3Url(existing.logoUrl)) {
          await deleteFromS3(existing.logoUrl);
        }
        logoUrl = await uploadToS3(files.logo[0], 'logos', id);
      }
      if (files.fondoLogin && files.fondoLogin[0]) {
        if (existing?.fondoLoginUrl && isS3Url(existing.fondoLoginUrl)) {
          await deleteFromS3(existing.fondoLoginUrl);
        }
        fondoLoginUrl = await uploadToS3(files.fondoLogin[0], 'login-bgs', id);
      }
    }

    // También manejar archivo único (backwards compatibility con upload.single())
    if (req.file) {
      if (existing?.logoUrl && isS3Url(existing.logoUrl)) {
        await deleteFromS3(existing.logoUrl);
      }
      logoUrl = await uploadToS3(req.file, 'logos', id);
    }

    const config = await updateInstitucionConfig(id, {
      colorPrimario: validated.colorPrimario,
      colorSecundario: validated.colorSecundario,
      lema: validated.lema ?? undefined,
      logoUrl,
      fondoLoginUrl,
      direccion: validated.direccion,
      codigoCentro: validated.codigoCentro,
      distritoEducativo: validated.distritoEducativo,
      regionalEducacion: validated.regionalEducacion,
      sabanaColores: validated.sabanaColores,
    });

    return res.status(200).json(config);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error updating config');
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    const msg = getErrorMessage(error);
    if (msg.includes('no encontrada')) {
      return res.status(404).json({ message: msg });
    }
    // Return actual error message for debugging
    return res.status(500).json({
      message: msg || 'Error interno del servidor',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
};

// Actualizar configuración visual (DIRECTOR - solo colores y sabana)
export const updateDirectorConfigHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const schema = z.object({
      colorPrimario: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      colorSecundario: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
      sabanaColores: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const config = await updateInstitucionConfig(id, {
      colorPrimario: validated.colorPrimario,
      colorSecundario: validated.colorSecundario,
      sabanaColores: validated.sabanaColores,
    });

    return res.status(200).json(config);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error updating director config');
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    const msg = getErrorMessage(error);
    if (msg.includes('no encontrada')) {
      return res.status(404).json({ message: msg });
    }
    return res.status(500).json({ message: msg || 'Error interno del servidor' });
  }
};

// ===== NUEVOS HANDLERS PARA SUPER ADMIN =====

// GET /api/v1/instituciones/slug/:slug/branding - Obtener branding por slug (público)
export const getBrandingBySlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    req.log.debug({ slug }, 'Buscando branding para slug');
    const branding = await getInstitucionBrandingBySlug(slug);

    if (!branding) {
      req.log.debug({ slug }, 'Institución no encontrada para slug');
      return res.status(404).json({ message: 'Institución no encontrada' });
    }

    return res.status(200).json(branding);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/instituciones/dominio/:dominio/branding - Obtener branding por dominio (público)
export const getBrandingByDominioHandler = async (req: Request, res: Response) => {
  try {
    const { dominio } = req.params as { dominio: string };
    const branding = await getInstitucionBrandingByDominio(dominio);

    if (!branding) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }

    return res.status(200).json(branding);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// PATCH /api/v1/instituciones/:id/sensitive - Actualizar configuración sensible (Solo ADMIN)
export const updateSensitiveConfigHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const sensitiveSchema = z.object({
      nombre: z.string().min(3).optional(),
      nombreMostrar: z.string().nullable().optional(),
      slug: z.string().min(3).optional(),
      dominioPersonalizado: z.string().nullable().optional(),
      idiomaPrincipal: z.nativeEnum(Idioma).optional(),
      logoPosicion: z.enum(['left', 'center', 'right']).optional(),
      logoWidth: z.number().int().positive().optional(),
      logoHeight: z.number().int().positive().optional(),
      activo: z.boolean().optional(),
      autogestionActividades: z.boolean().optional(),
      // Landing page fields
      heroTitle: z.string().nullable().optional(),
      heroSubtitle: z.string().nullable().optional(),
      // Login page fields
      loginBgType: z.enum(['color', 'image', 'gradient']).optional(),
      loginBgColor: z.string().optional(),
      loginBgGradient: z.string().nullable().optional(),
    });

    const validated = sensitiveSchema.parse(req.body);
    const result = await updateSensitiveConfig(id, validated);

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    const msg = getErrorMessage(error);
    if (msg.includes('no encontrada') || msg.includes('ya está en uso')) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/instituciones/check-slug/:slug - Verificar disponibilidad de slug
export const checkSlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    const { excludeId } = req.query as { excludeId?: string };

    const available = await checkSlugAvailability(slug, excludeId);

    return res.status(200).json({ available, slug });
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/instituciones/check-dominio/:dominio - Verificar disponibilidad de dominio
export const checkDominioHandler = async (req: Request, res: Response) => {
  try {
    const { dominio } = req.params as { dominio: string };
    const { excludeId } = req.query as { excludeId?: string };

    const available = await checkDominioAvailability(dominio, excludeId);

    return res.status(200).json({ available, dominio });
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// PATCH /api/v1/instituciones/:id/sistemas-educativos - Actualizar sistemas educativos
export const updateSistemasEducativosHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const sistemasSchema = z.object({
      sistemasEducativos: z
        .array(z.nativeEnum(SistemaEducativo))
        .min(1, 'Debe seleccionar al menos un sistema educativo'),
    });

    const validated = sistemasSchema.parse(req.body);
    const result = await updateSistemasEducativos(id, validated.sistemasEducativos);

    return res.status(200).json(result);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    const msg = getErrorMessage(error);
    if (msg.includes('no encontrada') || msg.includes('inválido')) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
