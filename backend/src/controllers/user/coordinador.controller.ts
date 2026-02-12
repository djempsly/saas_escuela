import { Request, Response } from 'express';
import {
  findCoordinadores,
  getCoordinacionInfo,
  assignCiclosToCoordinator,
  assignNivelesToCoordinator,
} from '../../services/user';
import { sanitizeErrorMessage } from '../../utils/security';
import { getErrorMessage } from '../../utils/error-helpers';

export const getCoordinadoresHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    // Usar resolvedInstitucionId
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No tienes una institucion asignada' });
    }

    const coordinadores = await findCoordinadores(req.resolvedInstitucionId);
    return res.status(200).json({ data: coordinadores });
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCoordinacionInfoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const info = await getCoordinacionInfo(id);
    return res.status(200).json({ data: info });
  } catch (error: unknown) {
    if (getErrorMessage(error) === 'Usuario no encontrado') {
      return res.status(404).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const assignCiclosHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { cicloIds } = req.body;

    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!Array.isArray(cicloIds)) {
      return res.status(400).json({ message: 'cicloIds debe ser un array' });
    }

    const result = await assignCiclosToCoordinator(id, cicloIds, req.resolvedInstitucionId);
    return res.status(200).json({ data: result });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    if (msg.includes('no encontrado') || msg.includes('no son validos')) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const assignNivelesHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { nivelIds } = req.body;

    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!Array.isArray(nivelIds)) {
      return res.status(400).json({ message: 'nivelIds debe ser un array' });
    }

    const result = await assignNivelesToCoordinator(id, nivelIds, req.resolvedInstitucionId);
    return res.status(200).json({ data: result });
  } catch (error: unknown) {
    if (getErrorMessage(error).includes('no encontrado')) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
