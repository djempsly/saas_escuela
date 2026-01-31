import { Request, Response } from 'express';
import { Idioma } from '@prisma/client';
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
} from '../services/institucion.service';
import { getFileUrl } from '../middleware/upload.middleware';
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

    // Schema de validación para config
    const configSchema = z.object({
      colorPrimario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      colorSecundario: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      lema: z.string().max(200).optional(),
    });

    const validated = configSchema.parse(req.body);

    // Si se subió un logo, obtener la URL
    let logoUrl: string | undefined;
    if (req.file) {
      logoUrl = getFileUrl(req.file);
    }

    const config = await updateInstitucionConfig(id, {
      ...validated,
      logoUrl,
    });

    return res.status(200).json(config);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// ===== NUEVOS HANDLERS PARA SUPER ADMIN =====

// GET /api/v1/instituciones/slug/:slug/branding - Obtener branding por slug (público)
export const getBrandingBySlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    const branding = await getInstitucionBrandingBySlug(slug);

    if (!branding) {
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
      slug: z.string().min(3).optional(),
      dominioPersonalizado: z.string().nullable().optional(),
      idiomaPrincipal: z.nativeEnum(Idioma).optional(),
      activo: z.boolean().optional(),
      autogestionActividades: z.boolean().optional(),
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
