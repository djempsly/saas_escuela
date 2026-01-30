import { Request, Response } from 'express';
import {
  createInstitucion,
  findInstituciones,
  findInstitucionById,
  updateInstitucion,
  deleteInstitucion,
} from '../services/institucion.service';
import { institucionSchema } from '../utils/zod.schemas';
import { z } from 'zod';

export const createInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = institucionSchema.parse({ body: req.body });
    const institucion = await createInstitucion(validatedData.body);
    return res.status(201).json(institucion);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const findInstitucionesHandler = async (req: Request, res: Response) => {
  try {
    const instituciones = await findInstituciones();
    return res.status(200).json(instituciones);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const findInstitucionByIdHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const institucion = await findInstitucionById(id);
    if (!institucion) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }
    return res.status(200).json(institucion);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
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
    return res.status(500).json({ message: error.message });
  }
};

export const deleteInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await deleteInstitucion(id);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
