import { Request, Response } from 'express';
import {
  tomarAsistencia,
  getAsistenciaByClaseYFecha,
  getReporteAsistenciaByClase,
  getReporteAsistenciaByEstudiante,
  getFechasAsistencia,
} from '../services/asistencia.service';
import { tomarAsistenciaSchema, reporteAsistenciaSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';

export const tomarAsistenciaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = tomarAsistenciaSchema.parse({ body: req.body });
    const resultado = await tomarAsistencia(validated.body, req.resolvedInstitucionId);
    return res.status(200).json(resultado);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrada') || error.message.includes('no inscritos')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getAsistenciaByFechaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { claseId } = req.params as { claseId: string };
    const { fecha } = req.query as { fecha: string };

    if (!fecha) {
      return res.status(400).json({ message: 'Fecha requerida (query param: fecha)' });
    }

    const asistencias = await getAsistenciaByClaseYFecha(
      claseId,
      new Date(fecha),
      req.resolvedInstitucionId
    );
    return res.status(200).json(asistencias);
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getReporteClaseHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const validated = reporteAsistenciaSchema.parse({ query: req.query });
    const { claseId, fechaInicio, fechaFin } = validated.query;

    const reporte = await getReporteAsistenciaByClase(
      claseId,
      fechaInicio,
      fechaFin,
      req.resolvedInstitucionId
    );
    return res.status(200).json(reporte);
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

export const getReporteEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { estudianteId } = req.params as { estudianteId: string };
    const { fechaInicio, fechaFin } = req.query as { fechaInicio: string; fechaFin: string };

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'fechaInicio y fechaFin son requeridos' });
    }

    const reporte = await getReporteAsistenciaByEstudiante(
      estudianteId,
      new Date(fechaInicio),
      new Date(fechaFin),
      req.resolvedInstitucionId
    );
    return res.status(200).json(reporte);
  } catch (error: any) {
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getFechasAsistenciaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { claseId } = req.params as { claseId: string };
    const fechas = await getFechasAsistencia(claseId, req.resolvedInstitucionId);
    return res.status(200).json(fechas);
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// Endpoint para que estudiantes vean su propia asistencia
export const getMiAsistenciaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { fechaInicio, fechaFin } = req.query as { fechaInicio: string; fechaFin: string };

    // Default: último mes
    const inicio = fechaInicio ? new Date(fechaInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fin = fechaFin ? new Date(fechaFin) : new Date();

    const reporte = await getReporteAsistenciaByEstudiante(
      req.user.usuarioId.toString(),
      inicio,
      fin,
      req.resolvedInstitucionId
    );
    return res.status(200).json(reporte);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
