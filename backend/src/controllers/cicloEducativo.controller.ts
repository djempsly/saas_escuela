import { Request, Response } from 'express';
import {
  createCicloEducativo,
  findCiclosEducativos,
  findCicloEducativoById,
  updateCicloEducativo,
  deleteCicloEducativo,
  assignNivelesACiclo,
  assignCoordinadoresACiclo,
} from '../services/cicloEducativo.service';
import { sanitizeErrorMessage } from '../utils/security';
import { getErrorMessage, isZodError } from '../utils/error-helpers';
import { z } from 'zod';
import { TipoCicloEducativo } from '@prisma/client';

const cicloEducativoSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  orden: z.number().int().positive().optional(),
  tipo: z.nativeEnum(TipoCicloEducativo).optional(),
});

const assignNivelesSchema = z.object({
  nivelIds: z.array(z.string()).min(0),
});

const assignCoordinadoresSchema = z.object({
  coordinadorIds: z.array(z.string()).min(0),
});

export const createCicloEducativoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const validated = cicloEducativoSchema.parse(req.body);
    const ciclo = await createCicloEducativo(validated, req.resolvedInstitucionId);
    return res.status(201).json(ciclo);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error instanceof Object && 'code' in error && error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un ciclo educativo con ese nombre' });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCiclosEducativosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const ciclos = await findCiclosEducativos(req.resolvedInstitucionId);
    return res.status(200).json(ciclos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCicloEducativoByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const ciclo = await findCicloEducativoById(id, req.resolvedInstitucionId);
    if (!ciclo) {
      return res.status(404).json({ message: 'Ciclo educativo no encontrado' });
    }
    return res.status(200).json(ciclo);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateCicloEducativoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const validated = cicloEducativoSchema.partial().parse(req.body);
    const ciclo = await updateCicloEducativo(id, req.resolvedInstitucionId, validated);
    return res.status(200).json(ciclo);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (getErrorMessage(error) === 'Ciclo educativo no encontrado') {
      return res.status(404).json({ message: getErrorMessage(error) });
    }
    if (error instanceof Object && 'code' in error && error.code === 'P2002') {
      return res.status(400).json({ message: 'Ya existe un ciclo educativo con ese nombre' });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteCicloEducativoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    await deleteCicloEducativo(id, req.resolvedInstitucionId);
    return res.status(204).send();
  } catch (error: unknown) {
    if (getErrorMessage(error) === 'Ciclo educativo no encontrado') {
      return res.status(404).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const assignNivelesHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const validated = assignNivelesSchema.parse(req.body);
    const ciclo = await assignNivelesACiclo(id, validated.nivelIds, req.resolvedInstitucionId);
    return res.status(200).json(ciclo);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (getErrorMessage(error) === 'Ciclo educativo no encontrado') {
      return res.status(404).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const assignCoordinadoresHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const validated = assignCoordinadoresSchema.parse(req.body);
    const ciclo = await assignCoordinadoresACiclo(
      id,
      validated.coordinadorIds,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(ciclo);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      getErrorMessage(error) === 'Ciclo educativo no encontrado' ||
      getErrorMessage(error) === 'Algunos coordinadores no son válidos'
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
