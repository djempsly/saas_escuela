import { Request, Response } from 'express';
import {
  createNivel,
  findNiveles,
  findNivelById,
  updateNivel,
  deleteNivel,
} from '../services/level.service';
import { nivelSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { isZodError } from '../utils/error-helpers';

export const createNivelHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = nivelSchema.parse({ body: req.body });
    const nivel = await createNivel(validated.body, req.resolvedInstitucionId);
    return res.status(201).json(nivel);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getNivelesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const niveles = await findNiveles(req.resolvedInstitucionId);
    return res.status(200).json(niveles);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getNivelByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const nivel = await findNivelById(id, req.resolvedInstitucionId);
    if (!nivel) {
      return res.status(404).json({ message: 'Nivel no encontrado' });
    }
    return res.status(200).json(nivel);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateNivelHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Validar datos de entrada con schema parcial
    const updateSchema = nivelSchema.shape.body.partial();
    const validated = updateSchema.parse(req.body);

    await updateNivel(id, req.resolvedInstitucionId, validated);
    return res.status(200).json({ message: 'Nivel actualizado' });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteNivelHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    await deleteNivel(id, req.resolvedInstitucionId);
    return res.status(204).send();
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
