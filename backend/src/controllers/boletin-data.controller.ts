/**
 * Controlador para obtener datos estructurados de boletines
 * Estos endpoints retornan JSON para ser consumidos por el frontend
 */

import { Request, Response } from 'express';
import { getBoletinData, getBoletinesClase } from '../services/boletin-data';
import { sanitizeErrorMessage } from '../utils/security';
import { getErrorMessage } from '../utils/error-helpers';

/**
 * Obtiene datos estructurados para generar un boletín de un estudiante
 * GET /api/v1/boletines/data/:estudianteId/:cicloId
 */
export const getBoletinDataHandler = async (req: Request, res: Response) => {
  try {
    const estudianteId = Array.isArray(req.params.estudianteId)
      ? req.params.estudianteId[0]
      : req.params.estudianteId;

    const cicloId = Array.isArray(req.params.cicloId) ? req.params.cicloId[0] : req.params.cicloId;

    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const data = await getBoletinData(estudianteId, cicloId, req.resolvedInstitucionId);

    return res.status(200).json(data);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error obteniendo datos del boletín');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

/**
 * Obtiene datos de boletines para todos los estudiantes de una clase
 * GET /api/v1/boletines/data/clase/:claseId/:cicloId
 */
export const getBoletinesClaseDataHandler = async (req: Request, res: Response) => {
  try {
    const claseId = Array.isArray(req.params.claseId) ? req.params.claseId[0] : req.params.claseId;

    const cicloId = Array.isArray(req.params.cicloId) ? req.params.cicloId[0] : req.params.cicloId;

    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const boletines = await getBoletinesClase(claseId, cicloId, req.resolvedInstitucionId);

    return res.status(200).json({
      total: boletines.length,
      boletines,
    });
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error obteniendo datos de boletines de clase');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
