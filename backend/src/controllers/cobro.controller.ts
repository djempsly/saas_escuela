import { Request, Response } from 'express';
import {
  crearCobro,
  crearCobrosMasivos,
  getCobros,
  getCobrosByEstudiante,
  getCobrosPendientes,
  registrarPago,
  getCobroById,
  getReportePagos,
  getEstadisticasCobros,
  getConceptosCobro,
  getMetodosPago,
} from '../services/cobro.service';
import { sanitizeErrorMessage } from '../utils/security';

const getUserId = (req: Request): string => {
  return String(req.user?.usuarioId || '');
};

const getUserRole = (req: Request): string => {
  return String(req.user?.rol || '');
};

export const crearCobroHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const cobro = await crearCobro(req.body, req.resolvedInstitucionId);
    return res.status(201).json(cobro);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrado')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const crearCobrosMasivosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await crearCobrosMasivos(req.body, req.resolvedInstitucionId);
    return res.status(201).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrado')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCobrosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { estado, concepto, estudianteId, cicloLectivoId } = req.query as {
      estado?: any;
      concepto?: any;
      estudianteId?: string;
      cicloLectivoId?: string;
    };

    const cobros = await getCobros(req.resolvedInstitucionId, {
      estado,
      concepto,
      estudianteId,
      cicloLectivoId,
    });

    return res.status(200).json(cobros);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCobrosByEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const result = await getCobrosByEstudiante(
      id,
      req.resolvedInstitucionId,
      getUserId(req),
      getUserRole(req)
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrado')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCobrosPendientesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const cobros = await getCobrosPendientes(req.resolvedInstitucionId);
    return res.status(200).json(cobros);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const registrarPagoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const result = await registrarPago(
      id,
      req.body,
      getUserId(req),
      req.resolvedInstitucionId
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (
      err.message.includes('no encontrado') ||
      err.message.includes('ya está pagado') ||
      err.message.includes('monto')
    ) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCobroByIdHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const cobro = await getCobroById(id, req.resolvedInstitucionId);

    return res.status(200).json(cobro);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrado')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getReportePagosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { fechaInicio, fechaFin } = req.query as {
      fechaInicio?: string;
      fechaFin?: string;
    };

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'Se requieren fechaInicio y fechaFin' });
    }

    const reporte = await getReportePagos(
      req.resolvedInstitucionId,
      new Date(fechaInicio),
      new Date(fechaFin)
    );

    return res.status(200).json(reporte);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getEstadisticasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { cicloLectivoId } = req.query as { cicloLectivoId?: string };
    const estadisticas = await getEstadisticasCobros(
      req.resolvedInstitucionId,
      cicloLectivoId
    );

    return res.status(200).json(estadisticas);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getConceptosCobroHandler = async (_req: Request, res: Response) => {
  try {
    const conceptos = getConceptosCobro();
    return res.status(200).json(conceptos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMetodosPagoHandler = async (_req: Request, res: Response) => {
  try {
    const metodos = getMetodosPago();
    return res.status(200).json(metodos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
