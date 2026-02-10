import { Request, Response } from 'express';
import { Idioma, SistemaEducativo } from '@prisma/client';
import prisma from '../config/db';
import {
  createInstitucion,
  findInstituciones,
  findInstitucionById,
  updateInstitucion,
  deleteInstitucion,
  getInstitucionBranding,
  updateInstitucionConfig,
  getInstitucionBrandingBySlug,
  getInstitucionBrandingByDominio,
  updateSensitiveConfig,
  checkSlugAvailability,
  checkDominioAvailability,
  updateSistemasEducativos,
} from '../services/institucion.service';
import { uploadToS3, deleteFromS3, isS3Url } from '../services/s3.service';
import { institucionSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { z } from 'zod';

export const createInstitucionHandler = async (req: Request, res: Response) => {
  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const validatedData = institucionSchema.parse({ body: req.body });
    console.log('Validated data:', JSON.stringify(validatedData.body, null, 2));
    const result = await createInstitucion(validatedData.body);
    return res.status(201).json({
      status: 'success',
      data: {
        institucion: result.institucion,
        tempPassword: result.tempPassword
      }
    });
  } catch (error: any) {
    console.error('Error creating institucion:', error);
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores de duplicado son seguros para mostrar
    if (error.message?.includes('ya está en uso') || error.message?.includes('Sistema educativo')) {
      return res.status(409).json({ message: error.message });
    }
    // Errores de Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un registro con estos datos únicos' });
    }
    // Mostrar el error real para debugging
    return res.status(500).json({
      message: error.message || sanitizeErrorMessage(error),
      code: error.code,
    });
  }
};

export const findInstitucionesHandler = async (req: Request, res: Response) => {
  try {
    const instituciones = await findInstituciones();
    return res.status(200).json(instituciones);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const findInstitucionByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const institucion = await findInstitucionById(id);
    if (!institucion) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }
    return res.status(200).json(institucion);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Validar que la institución existe
    const existing = await findInstitucionById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }

    const validatedData = z
      .object({
        body: institucionSchema.shape.body.partial(),
      })
      .parse({ body: req.body });

    const institucion = await updateInstitucion(id, validatedData.body);
    return res.status(200).json(institucion);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    await deleteInstitucion(id);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting institucion:', error);
    // Errores de validación/negocio son seguros para mostrar
    if (error.message?.includes('No se puede eliminar') || error.message?.includes('no encontrada')) {
      return res.status(400).json({ message: error.message });
    }
    // Errores de Prisma por foreign key
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(400).json({
        message: 'No se puede eliminar la institución porque tiene registros asociados. Desactívela en lugar de eliminarla.',
      });
    }
    return res.status(500).json({ message: error.message || sanitizeErrorMessage(error) });
  }
};

// Obtener branding de una institución (público)
export const getBrandingHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const branding = await getInstitucionBranding(id);
    if (!branding) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }
    return res.status(200).json(branding);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// Actualizar configuración de branding (Solo ADMIN)
export const updateConfigHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Schema de validación para config (todos opcionales para multipart)
    const configSchema = z.object({
      colorPrimario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      colorSecundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
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
  } catch (error: any) {
    console.error('Error updating config:', error?.message || error);
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message?.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    // Return actual error message for debugging
    return res.status(500).json({
      message: error.message || 'Error interno del servidor',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Actualizar configuración visual (DIRECTOR - solo colores y sabana)
export const updateDirectorConfigHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const schema = z.object({
      colorPrimario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      colorSecundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      sabanaColores: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const config = await updateInstitucionConfig(id, {
      colorPrimario: validated.colorPrimario,
      colorSecundario: validated.colorSecundario,
      sabanaColores: validated.sabanaColores,
    });

    return res.status(200).json(config);
  } catch (error: any) {
    console.error('Error updating director config:', error?.message || error);
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message?.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || 'Error interno del servidor' });
  }
};

// ===== NUEVOS HANDLERS PARA SUPER ADMIN =====

// GET /api/v1/instituciones/slug/:slug/branding - Obtener branding por slug (público)
export const getBrandingBySlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    console.log(`[DEBUG] Buscando branding para slug: "${slug}"`);
    const branding = await getInstitucionBrandingBySlug(slug);

    if (!branding) {
      console.log(`[DEBUG] Institución no encontrada para slug: "${slug}"`);
      return res.status(404).json({ message: 'Institución no encontrada' });
    }

    return res.status(200).json(branding);
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrada') || error.message.includes('ya está en uso')) {
      return res.status(400).json({ message: error.message });
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
  } catch (error: any) {
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
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// PATCH /api/v1/instituciones/:id/sistemas-educativos - Actualizar sistemas educativos
export const updateSistemasEducativosHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const sistemasSchema = z.object({
      sistemasEducativos: z.array(z.nativeEnum(SistemaEducativo)).min(1, 'Debe seleccionar al menos un sistema educativo'),
    });

    const validated = sistemasSchema.parse(req.body);
    const result = await updateSistemasEducativos(id, validated.sistemasEducativos);

    return res.status(200).json(result);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrada') || error.message.includes('inválido')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/instituciones/:id/favicon - Subir favicon
export const uploadFaviconHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo de favicon' });
    }

    // Borrar favicon anterior de S3 si existe
    const existingFavicon = await prisma.institucion.findUnique({
      where: { id },
      select: { faviconUrl: true },
    });
    if (existingFavicon?.faviconUrl && isS3Url(existingFavicon.faviconUrl)) {
      await deleteFromS3(existingFavicon.faviconUrl);
    }

    const faviconUrl = await uploadToS3(req.file, 'favicons', id);

    const result = await prisma.institucion.update({
      where: { id },
      data: { faviconUrl },
      select: { id: true, faviconUrl: true },
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error uploading favicon:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/instituciones/:id/hero - Subir imagen hero
export const uploadHeroHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó imagen hero' });
    }

    // Borrar hero anterior de S3 si existe
    const existingHero = await prisma.institucion.findUnique({
      where: { id },
      select: { heroImageUrl: true },
    });
    if (existingHero?.heroImageUrl && isS3Url(existingHero.heroImageUrl)) {
      await deleteFromS3(existingHero.heroImageUrl);
    }

    const heroImageUrl = await uploadToS3(req.file, 'heroes', id);

    const result = await prisma.institucion.update({
      where: { id },
      data: { heroImageUrl },
      select: { id: true, heroImageUrl: true },
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error uploading hero image:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/instituciones/:id/login-logo - Subir logo de login
export const uploadLoginLogoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó logo de login' });
    }

    // Borrar login logo anterior de S3 si existe
    const existingLoginLogo = await prisma.institucion.findUnique({
      where: { id },
      select: { loginLogoUrl: true },
    });
    if (existingLoginLogo?.loginLogoUrl && isS3Url(existingLoginLogo.loginLogoUrl)) {
      await deleteFromS3(existingLoginLogo.loginLogoUrl);
    }

    const loginLogoUrl = await uploadToS3(req.file, 'login-logos', id);

    const result = await prisma.institucion.update({
      where: { id },
      data: { loginLogoUrl },
      select: { id: true, loginLogoUrl: true },
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error uploading login logo:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
