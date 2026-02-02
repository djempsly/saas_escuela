import { Request, Response } from 'express';
import {
  getDashboardStats,
  getDashboardStatsDocente,
  getDashboardStatsEstudiante,
} from '../services/dashboard.service';
import { sanitizeErrorMessage } from '../utils/security';
import { Role } from '@prisma/client';

export const getDashboardStatsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.institucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { usuarioId, institucionId, rol } = req.user;

    let stats;

    switch (rol) {
      case Role.DIRECTOR:
      case Role.COORDINADOR:
      case Role.COORDINADOR_ACADEMICO:
      case Role.SECRETARIA:
        stats = await getDashboardStats(institucionId);
        break;

      case Role.DOCENTE:
        stats = await getDashboardStatsDocente(usuarioId, institucionId);
        break;

      case Role.ESTUDIANTE:
        stats = await getDashboardStatsEstudiante(usuarioId, institucionId);
        break;

      default:
        return res.status(403).json({ message: 'Rol no soportado' });
    }

    return res.status(200).json(stats);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
