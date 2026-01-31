import { Request, Response } from 'express';
import {
  crearConversacion,
  getConversaciones,
  getMensajes,
  getMensajesNuevos,
  enviarMensaje,
  marcarComoLeida,
  getNoLeidos,
  getUsuariosDisponibles,
} from '../services/mensaje.service';
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

export const crearConversacionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const conversacion = await crearConversacion(
      req.body,
      getUserId(req),
      req.resolvedInstitucionId
    );

    return res.status(201).json(conversacion);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrados')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getConversacionesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const conversaciones = await getConversaciones(
      getUserId(req),
      req.resolvedInstitucionId
    );

    return res.status(200).json(conversaciones);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMensajesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const { limit, cursor } = req.query as { limit?: string; cursor?: string };

    const result = await getMensajes(
      id,
      getUserId(req),
      req.resolvedInstitucionId,
      limit ? parseInt(limit, 10) : 50,
      cursor
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('No eres participante')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMensajesNuevosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const { desde } = req.query as { desde?: string };

    if (!desde) {
      return res.status(400).json({ message: 'Se requiere el parámetro desde' });
    }

    const mensajes = await getMensajesNuevos(
      id,
      getUserId(req),
      req.resolvedInstitucionId,
      new Date(desde)
    );

    return res.status(200).json(mensajes);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('No eres participante')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const enviarMensajeHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const mensaje = await enviarMensaje(
      id,
      req.body,
      getUserId(req),
      req.resolvedInstitucionId
    );

    return res.status(201).json(mensaje);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('No eres participante')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const marcarComoLeidaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    await marcarComoLeida(id, getUserId(req), req.resolvedInstitucionId);

    return res.status(200).json({ message: 'Marcado como leído' });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getNoLeidosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await getNoLeidos(
      getUserId(req),
      req.resolvedInstitucionId
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getUsuariosDisponiblesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const usuarios = await getUsuariosDisponibles(
      getUserId(req),
      getUserRole(req),
      req.resolvedInstitucionId
    );

    return res.status(200).json(usuarios);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
