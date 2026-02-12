import { Request, Response } from 'express';
import {
  createMateria,
  findMaterias,
  findMateriaById,
  updateMateria,
  deleteMateria,
} from '../services/subject.service';
import { materiaSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { isZodError } from '../utils/error-helpers';

export const createMateriaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = materiaSchema.parse({ body: req.body });
    const materia = await createMateria(validated.body, req.resolvedInstitucionId);
    return res.status(201).json(materia);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMateriasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const materias = await findMaterias(req.resolvedInstitucionId);
    return res.status(200).json(materias);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMateriaByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const materia = await findMateriaById(id, req.resolvedInstitucionId);
    if (!materia) {
      return res.status(404).json({ message: 'Materia no encontrada' });
    }
    return res.status(200).json(materia);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateMateriaHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Validar datos de entrada con schema parcial
    const updateSchema = materiaSchema.shape.body.partial();
    const validated = updateSchema.parse(req.body);

    await updateMateria(id, req.resolvedInstitucionId, validated);
    return res.status(200).json({ message: 'Materia actualizada' });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteMateriaHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    await deleteMateria(id, req.resolvedInstitucionId);
    return res.status(204).send();
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
