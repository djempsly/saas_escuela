import { Request, Response } from 'express';
import {
  getNotificaciones,
  getNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
} from '../services/notificacion.service';
import { sanitizeErrorMessage } from '../utils/security';

const getUserId = (req: Request): string => {
  return String(req.user?.usuarioId || '');
};

export const getNotificacionesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { limit, offset } = req.query as { limit?: string; offset?: string };
    const result = await getNotificaciones(
      getUserId(req),
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getNoLeidasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const result = await getNoLeidas(getUserId(req));
    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const marcarComoLeidaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    await marcarComoLeida(id, getUserId(req));

    return res.status(200).json({ message: 'Notificación marcada como leída' });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada')) {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const marcarTodasComoLeidasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    await marcarTodasComoLeidas(getUserId(req));
    return res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
