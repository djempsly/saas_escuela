import { Request, Response } from 'express';
import {
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  getEventos,
  getEventoById,
  getTiposEvento,
  getFeriados,
} from '../services/evento.service';
import { sanitizeErrorMessage } from '../utils/security';

const getUserId = (req: Request): string => {
  return String(req.user?.usuarioId || '');
};

const getUserRole = (req: Request): string => {
  return String(req.user?.rol || '');
};

const getInstitucionId = (req: Request): string => {
  return String(req.resolvedInstitucionId || '');
};

export const crearEventoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const evento = await crearEvento(req.body, getUserId(req), getInstitucionId(req));

    return res.status(201).json(evento);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const actualizarEventoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const evento = await actualizarEvento(
      id,
      req.body,
      getUserId(req),
      getUserRole(req),
      getInstitucionId(req),
    );

    return res.status(200).json(evento);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrad')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const eliminarEventoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    await eliminarEvento(id, getUserId(req), getUserRole(req), getInstitucionId(req));

    return res.status(200).json({ message: 'Evento eliminado exitosamente' });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrad')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getEventosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { fechaInicio, fechaFin, claseId } = req.query as {
      fechaInicio?: string;
      fechaFin?: string;
      claseId?: string;
    };

    const eventos = await getEventos(
      getUserId(req),
      getUserRole(req),
      getInstitucionId(req),
      fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin ? new Date(fechaFin) : undefined,
      claseId,
    );

    return res.status(200).json(eventos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getEventoByIdHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const evento = await getEventoById(id, getUserId(req), getUserRole(req), getInstitucionId(req));

    return res.status(200).json(evento);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrad')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('No tienes acceso')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getTiposEventoHandler = async (_req: Request, res: Response) => {
  try {
    const tipos = getTiposEvento();
    return res.status(200).json(tipos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getFeriadosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { fechaInicio, fechaFin } = req.query as {
      fechaInicio?: string;
      fechaFin?: string;
    };

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'fechaInicio y fechaFin son requeridos' });
    }

    const feriados = await getFeriados(
      getInstitucionId(req),
      new Date(fechaInicio),
      new Date(fechaFin),
    );

    return res.status(200).json(feriados);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
