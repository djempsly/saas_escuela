/**
 * Controller para Sábana de Notas
 */

import { Request, Response } from 'express';
import {
  getSabanaByNivel,
  getNivelesParaSabana,
  getCiclosLectivosParaSabana,
  updateCalificacionSabana,
} from '../services/sabana.service';
import { z } from 'zod';

/**
 * GET /sabana/niveles
 * Obtiene los niveles disponibles para la sábana de notas
 */
export const getNivelesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    const niveles = await getNivelesParaSabana(user.institucionId, user.usuarioId, user.rol);
    return res.json(niveles);
  } catch (error: any) {
    console.error('Error obteniendo niveles para sábana:', error);
    return res.status(500).json({ error: error.message || 'Error del servidor' });
  }
};

/**
 * GET /sabana/ciclos-lectivos
 * Obtiene los ciclos lectivos activos
 */
export const getCiclosLectivosHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    const ciclos = await getCiclosLectivosParaSabana(user.institucionId);
    return res.json(ciclos);
  } catch (error: any) {
    console.error('Error obteniendo ciclos lectivos:', error);
    return res.status(500).json({ error: error.message || 'Error del servidor' });
  }
};

/**
 * GET /sabana/:nivelId/:cicloLectivoId
 * Obtiene los datos completos de la sábana de notas
 */
export const getSabanaHandler = async (req: Request, res: Response) => {
  try {
    const nivelId = req.params.nivelId as string;
    const cicloLectivoId = req.params.cicloLectivoId as string;
    const user = (req as any).user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    if (!nivelId || !cicloLectivoId) {
      return res.status(400).json({ error: 'Debe proporcionar nivelId y cicloLectivoId' });
    }

    const sabana = await getSabanaByNivel(nivelId, cicloLectivoId, user.institucionId, user.usuarioId);
    return res.json(sabana);
  } catch (error: any) {
    console.error('Error obteniendo sábana de notas:', error);
    return res.status(500).json({ error: error.message || 'Error del servidor' });
  }
};

// Schema para validar actualización de calificación
const updateCalificacionSchema = z.object({
  claseId: z.string().min(1, 'claseId es requerido'),
  estudianteId: z.string().min(1, 'estudianteId es requerido'),
  periodo: z.string().min(2, 'periodo es requerido'), // Soporta p1-p4 y RA1-RA10
  valor: z.number().min(0).max(100).nullable(),
  competenciaId: z.string().optional(),
});

/**
 * PATCH /sabana/calificacion
 * Actualiza una calificación específica
 */
export const updateCalificacionHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    const validation = updateCalificacionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      });
    }

    const { claseId, estudianteId, periodo, valor, competenciaId } = validation.data;

    const calificacion = await updateCalificacionSabana(
      claseId,
      estudianteId,
      periodo,
      valor,
      user.usuarioId,
      user.rol,
      user.institucionId,
      competenciaId
    );

    return res.json(calificacion);
  } catch (error: any) {
    console.error('Error actualizando calificación:', error);
    return res.status(500).json({ error: error.message || 'Error del servidor' });
  }
};
