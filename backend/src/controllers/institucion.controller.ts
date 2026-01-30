import { Request, Response } from 'express';
import {
  createInstitucion,
  findInstituciones,
  findInstitucionById,
  updateInstitucion,
  deleteInstitucion,
  getInstitucionBranding,
  updateInstitucionConfig,
} from '../services/institucion.service';
import { getFileUrl } from '../middleware/upload.middleware';
import { institucionSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { z } from 'zod';

export const createInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = institucionSchema.parse({ body: req.body });
    const result = await createInstitucion(validatedData.body);
    return res.status(201).json({
      status: 'success',
      data: {
        institucion: result.institucion,
        tempPassword: result.tempPassword
      }
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores de duplicado son seguros para mostrar
    if (error.message.includes('ya está en uso') || error.message.includes('Sistema educativo')) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
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

    // Validar que la institución existe
    const existing = await findInstitucionById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }

    await deleteInstitucion(id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
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
