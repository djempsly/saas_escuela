import { Request, Response } from 'express';
import {
  createCicloLectivo,
  findCiclosLectivos,
  findCicloLectivoById,
  updateCicloLectivo,
  deleteCicloLectivo,
} from '../services/cycle.service';
import { cicloLectivoSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { isZodError } from '../utils/error-helpers';

export const createCicloHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = cicloLectivoSchema.parse({ body: req.body });
    const ciclo = await createCicloLectivo(validated.body, req.resolvedInstitucionId);
    return res.status(201).json(ciclo);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCiclosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const ciclos = await findCiclosLectivos(req.resolvedInstitucionId);
    return res.status(200).json(ciclos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCicloByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const ciclo = await findCicloLectivoById(id, req.resolvedInstitucionId);
    if (!ciclo) {
      return res.status(404).json({ message: 'Ciclo no encontrado' });
    }
    return res.status(200).json(ciclo);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateCicloHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Validar datos de entrada con schema parcial
    const updateSchema = cicloLectivoSchema.shape.body.partial();
    const validated = updateSchema.parse(req.body);

    await updateCicloLectivo(id, req.resolvedInstitucionId, validated);
    return res.status(200).json({ message: 'Ciclo actualizado' });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteCicloHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    await deleteCicloLectivo(id, req.resolvedInstitucionId);
    return res.status(204).send();
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
