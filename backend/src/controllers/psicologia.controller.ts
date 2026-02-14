import { Request, Response } from 'express';
import { z } from 'zod';
import {
  getEstudiantesNotasBajas,
  crearObservacion,
  getObservaciones,
  eliminarObservacion,
} from '../services/psicologia.service';
import { sanitizeErrorMessage } from '../utils/security';
import { getErrorMessage, isZodError } from '../utils/error-helpers';

const crearObservacionSchema = z.object({
  body: z.object({
    estudianteId: z.string().min(1, 'Estudiante requerido'),
    texto: z.string().min(1, 'Texto requerido'),
  }),
});

export const getEstudiantesNotasBajasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const cicloLectivoId = req.query.cicloLectivoId as string;
    if (!cicloLectivoId) {
      return res.status(400).json({ message: 'cicloLectivoId requerido' });
    }
    const data = await getEstudiantesNotasBajas(req.resolvedInstitucionId, cicloLectivoId);
    return res.json(data);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getObservacionesHandler = async (req: Request, res: Response) => {
  try {
    const estudianteId = req.params.estudianteId as string;
    const data = await getObservaciones(estudianteId);
    return res.json(data);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const crearObservacionHandler = async (req: Request, res: Response) => {
  try {
    const validated = crearObservacionSchema.parse({ body: req.body });
    const psicologoId = req.user?.usuarioId;
    if (!psicologoId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const data = await crearObservacion(validated.body.estudianteId, psicologoId, validated.body.texto);
    return res.status(201).json(data);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const eliminarObservacionHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const psicologoId = req.user?.usuarioId;
    if (!psicologoId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    await eliminarObservacion(id, psicologoId);
    return res.json({ message: 'Observación eliminada' });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    if (msg.includes('no encontrada') || msg.includes('No autorizado')) {
      return res.status(msg.includes('No autorizado') ? 403 : 404).json({ message: msg });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
