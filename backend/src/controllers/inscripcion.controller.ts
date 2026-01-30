import { Request, Response } from 'express';
import {
  inscribirEstudiante,
  inscribirPorCodigo,
  findInscripcionesByClase,
  findInscripcionesByEstudiante,
  eliminarInscripcion,
  inscribirMasivo,
} from '../services/inscripcion.service';
import { inscripcionSchema, inscripcionMasivaSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { Role } from '@prisma/client';

export const inscribirEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = inscripcionSchema.parse({ body: req.body });
    const inscripcion = await inscribirEstudiante(validated.body, req.resolvedInstitucionId);
    return res.status(201).json(inscripcion);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrad') ||
        error.message.includes('ya está inscrito') ||
        error.message.includes('no está activo')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const inscribirPorCodigoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Solo estudiantes pueden auto-inscribirse por código
    if (req.user.rol !== Role.ESTUDIANTE) {
      return res.status(403).json({ message: 'Solo estudiantes pueden usar esta función' });
    }

    const { codigo } = req.body as { codigo: string };
    if (!codigo) {
      return res.status(400).json({ message: 'Código de clase requerido' });
    }

    const inscripcion = await inscribirPorCodigo(codigo, req.user.usuarioId.toString());
    return res.status(201).json(inscripcion);
  } catch (error: any) {
    if (error.message.includes('no válido') ||
        error.message.includes('Ya estás inscrito') ||
        error.message.includes('no está activo') ||
        error.message.includes('No tienes permiso')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getInscripcionesByClaseHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { claseId } = req.params as { claseId: string };
    const inscripciones = await findInscripcionesByClase(claseId, req.resolvedInstitucionId);
    return res.status(200).json(inscripciones);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMisInscripcionesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const inscripciones = await findInscripcionesByEstudiante(
      req.user.usuarioId.toString(),
      req.resolvedInstitucionId
    );
    return res.status(200).json(inscripciones);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getInscripcionesByEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { estudianteId } = req.params as { estudianteId: string };
    const inscripciones = await findInscripcionesByEstudiante(estudianteId, req.resolvedInstitucionId);
    return res.status(200).json(inscripciones);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const eliminarInscripcionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { id } = req.params as { id: string };
    await eliminarInscripcion(id, req.resolvedInstitucionId);
    return res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const inscribirMasivoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = inscripcionMasivaSchema.parse({ body: req.body });
    const resultados = await inscribirMasivo(
      validated.body.claseId,
      validated.body.estudianteIds,
      req.resolvedInstitucionId
    );
    return res.status(200).json(resultados);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrada') || error.message.includes('no activo')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
