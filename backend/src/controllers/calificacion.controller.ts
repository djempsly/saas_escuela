import { Request, Response } from 'express';
import {
  guardarCalificacion,
  guardarCalificacionTecnica,
  getCalificacionesByClase,
  getCalificacionesByEstudiante,
  getBoletinEstudiante,
  guardarCalificacionesMasivas,
} from '../services/calificacion';
import {
  calificacionSchema,
  calificacionTecnicaSchema,
  calificacionMasivaSchema,
} from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { Role } from '@prisma/client';

export const guardarCalificacionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = calificacionSchema.parse({ body: req.body });
    const calificacion = await guardarCalificacion(validated.body, req.resolvedInstitucionId);
    return res.status(200).json(calificacion);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      error.message.includes('no encontrad') ||
      error.message.includes('no inscrito') ||
      error.message.includes('técnica')
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const guardarCalificacionTecnicaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = calificacionTecnicaSchema.parse({ body: req.body });
    const calificacion = await guardarCalificacionTecnica(
      validated.body,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(calificacion);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      error.message.includes('no encontrad') ||
      error.message.includes('no inscrito') ||
      error.message.includes('Politécnico') ||
      error.message.includes('no es de tipo técnica')
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCalificacionesClaseHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { claseId } = req.params as { claseId: string };
    const calificaciones = await getCalificacionesByClase(claseId, req.resolvedInstitucionId);
    return res.status(200).json(calificaciones);
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCalificacionesEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { estudianteId } = req.params as { estudianteId: string };
    const { cicloLectivoId } = req.query as { cicloLectivoId?: string };
    const calificaciones = await getCalificacionesByEstudiante(
      estudianteId,
      req.resolvedInstitucionId,
      cicloLectivoId,
    );
    return res.status(200).json(calificaciones);
  } catch (error: any) {
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMisCalificacionesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const { cicloLectivoId } = req.query as { cicloLectivoId?: string };
    const calificaciones = await getCalificacionesByEstudiante(
      req.user.usuarioId.toString(),
      req.resolvedInstitucionId,
      cicloLectivoId,
    );
    return res.status(200).json(calificaciones);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getBoletinHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { estudianteId, cicloLectivoId } = req.params as {
      estudianteId: string;
      cicloLectivoId: string;
    };
    const boletin = await getBoletinEstudiante(
      estudianteId,
      cicloLectivoId,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(boletin);
  } catch (error: any) {
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMiBoletinHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const { cicloLectivoId } = req.params as { cicloLectivoId: string };
    const boletin = await getBoletinEstudiante(
      req.user.usuarioId.toString(),
      cicloLectivoId,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(boletin);
  } catch (error: any) {
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const guardarCalificacionesMasivasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = calificacionMasivaSchema.parse({ body: req.body });
    const resultado = await guardarCalificacionesMasivas(
      validated.body.claseId,
      validated.body.periodo,
      validated.body.calificaciones,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(resultado);
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
