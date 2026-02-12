import { Request, Response } from 'express';
import {
  createInstitucion,
  findInstituciones,
  findInstitucionById,
  updateInstitucion,
  deleteInstitucion,
} from '../../services/institucion';
import { institucionSchema } from '../../utils/zod.schemas';
import { sanitizeErrorMessage } from '../../utils/security';
import { z } from 'zod';

export const createInstitucionHandler = async (req: Request, res: Response) => {
  try {
    req.log.debug({ body: req.body }, 'Request body');
    const validatedData = institucionSchema.parse({ body: req.body });
    req.log.debug({ data: validatedData.body }, 'Validated data');
    const result = await createInstitucion(validatedData.body);
    return res.status(201).json({
      status: 'success',
      data: {
        institucion: result.institucion,
        tempPassword: result.tempPassword,
      },
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error creating institucion');
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
    req.log.error({ err: error }, 'Error deleting institucion');
    // Errores de validación/negocio son seguros para mostrar
    if (
      error.message?.includes('No se puede eliminar') ||
      error.message?.includes('no encontrada')
    ) {
      return res.status(400).json({ message: error.message });
    }
    // Errores de Prisma por foreign key
    if (error.code === 'P2003' || error.code === 'P2014') {
      return res.status(400).json({
        message:
          'No se puede eliminar la institución porque tiene registros asociados. Desactívela en lugar de eliminarla.',
      });
    }
    return res.status(500).json({ message: error.message || sanitizeErrorMessage(error) });
  }
};
