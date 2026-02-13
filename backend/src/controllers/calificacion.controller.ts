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
import { getErrorMessage, isZodError } from '../utils/error-helpers';
import { toCalificacionDTO, toCalificacionDTOList } from '../dtos';

export const guardarCalificacionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = calificacionSchema.parse({ body: req.body });
    const calificacion = await guardarCalificacion(validated.body, req.resolvedInstitucionId);
    return res.status(200).json(toCalificacionDTO(calificacion));
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      getErrorMessage(error).includes('no encontrad') ||
      getErrorMessage(error).includes('no inscrito') ||
      getErrorMessage(error).includes('técnica') ||
      getErrorMessage(error).includes('cerrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
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
    return res.status(200).json(toCalificacionDTO(calificacion));
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      getErrorMessage(error).includes('no encontrad') ||
      getErrorMessage(error).includes('no inscrito') ||
      getErrorMessage(error).includes('Politécnico') ||
      getErrorMessage(error).includes('no es de tipo técnica') ||
      getErrorMessage(error).includes('cerrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
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
  } catch (error: unknown) {
    if (getErrorMessage(error).includes('no encontrada')) {
      return res.status(404).json({ message: getErrorMessage(error) });
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
    const result = await getCalificacionesByEstudiante(
      estudianteId,
      req.resolvedInstitucionId,
      cicloLectivoId,
    );
    return res.status(200).json({
      estudiante: result.estudiante,
      calificaciones: toCalificacionDTOList(result.calificaciones),
      ...(result.calificacionesTecnicas && { calificacionesTecnicas: result.calificacionesTecnicas }),
      ...(result.calificacionesCompetencia && {
        calificacionesCompetencia: toCalificacionDTOList(result.calificacionesCompetencia),
      }),
    });
  } catch (error: unknown) {
    if (getErrorMessage(error).includes('no encontrado')) {
      return res.status(404).json({ message: getErrorMessage(error) });
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
    const result = await getCalificacionesByEstudiante(
      req.user.usuarioId.toString(),
      req.resolvedInstitucionId,
      cicloLectivoId,
    );
    return res.status(200).json({
      estudiante: result.estudiante,
      calificaciones: toCalificacionDTOList(result.calificaciones),
      ...(result.calificacionesTecnicas && { calificacionesTecnicas: result.calificacionesTecnicas }),
      ...(result.calificacionesCompetencia && {
        calificacionesCompetencia: toCalificacionDTOList(result.calificacionesCompetencia),
      }),
    });
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    if (getErrorMessage(error).includes('no encontrado')) {
      return res.status(404).json({ message: getErrorMessage(error) });
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
  } catch (error: unknown) {
    if (getErrorMessage(error).includes('no encontrado')) {
      return res.status(404).json({ message: getErrorMessage(error) });
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
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (getErrorMessage(error).includes('no encontrada')) {
      return res.status(404).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
