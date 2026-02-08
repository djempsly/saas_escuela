import { Request, Response } from 'express';
import { AccionAudit } from '@prisma/client';
import { getAuditLogs } from '../services/audit.service';
import { sanitizeErrorMessage } from '../utils/security';

export const getAuditLogsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const {
      page,
      limit,
      fechaDesde,
      fechaHasta,
      usuarioId,
      entidad,
      accion,
    } = req.query as {
      page?: string;
      limit?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      usuarioId?: string;
      entidad?: string;
      accion?: string;
    };

    const result = await getAuditLogs({
      institucionId: req.resolvedInstitucionId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      fechaDesde,
      fechaHasta,
      usuarioId,
      entidad,
      accion: accion as AccionAudit | undefined,
    });

    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
