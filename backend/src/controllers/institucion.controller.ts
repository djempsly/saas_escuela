import { Request, Response } from 'express';
import {
  createInstitucion,
  findInstituciones,
  findInstitucionById,
  updateInstitucion,
  deleteInstitucion,
} from '../services/institucion.service';
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
