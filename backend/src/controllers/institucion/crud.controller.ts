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
import { getErrorMessage, isZodError } from '../../utils/error-helpers';
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
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error creating institucion');
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    const msg = getErrorMessage(error);
    // Errores de duplicado son seguros para mostrar
    if (msg.includes('ya está en uso') || msg.includes('Sistema educativo')) {
      return res.status(409).json({ message: msg });
    }
    // Errores de Prisma
    const errCode = (error as { code?: string }).code;
    if (errCode === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un registro con estos datos únicos' });
    }
    // Mostrar el error real para debugging
    return res.status(500).json({
      message: msg || sanitizeErrorMessage(error),
      code: errCode,
    });
  }
};

export const findInstitucionesHandler = async (req: Request, res: Response) => {
  try {
    const instituciones = await findInstituciones();
    return res.status(200).json(instituciones);
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    if (isZodError(error)) {
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
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error deleting institucion');
    const msg = getErrorMessage(error);
    // Errores de validación/negocio son seguros para mostrar
    if (
      msg.includes('No se puede eliminar') ||
      msg.includes('no encontrada')
    ) {
      return res.status(400).json({ message: msg });
    }
    // Errores de Prisma por foreign key
    const errCode = (error as { code?: string }).code;
    if (errCode === 'P2003' || errCode === 'P2014') {
      return res.status(400).json({
        message:
          'No se puede eliminar la institución porque tiene registros asociados. Desactívela en lugar de eliminarla.',
      });
    }
    return res.status(500).json({ message: msg || sanitizeErrorMessage(error) });
  }
};
