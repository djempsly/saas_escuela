/**
 * Controller para Sábana de Notas
 */

import { Request, Response } from 'express';
import {
  getSabanaByNivel,
  getNivelesParaSabana,
  getCiclosLectivosParaSabana,
  updateCalificacionSabana,
  publicarCalificaciones,
} from '../services/sabana';
import { z } from 'zod';
import { getErrorMessage } from '../utils/error-helpers';
import { registrarAuditLog } from '../services/audit.service';

/**
 * GET /sabana/niveles
 * Obtiene los niveles disponibles para la sábana de notas
 */
export const getNivelesHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    const niveles = await getNivelesParaSabana(user.institucionId, user.usuarioId, user.rol);
    return res.json(niveles);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error obteniendo niveles para sábana');
    return res.status(500).json({ error: getErrorMessage(error) || 'Error del servidor' });
  }
};

/**
 * GET /sabana/ciclos-lectivos
 * Obtiene los ciclos lectivos activos
 */
export const getCiclosLectivosHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    const ciclos = await getCiclosLectivosParaSabana(user.institucionId);
    return res.json(ciclos);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error obteniendo ciclos lectivos');
    return res.status(500).json({ error: getErrorMessage(error) || 'Error del servidor' });
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
    const user = req.user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    if (!nivelId || !cicloLectivoId) {
      return res.status(400).json({ error: 'Debe proporcionar nivelId y cicloLectivoId' });
    }

    const sabana = await getSabanaByNivel(
      nivelId,
      cicloLectivoId,
      user.institucionId,
      user.usuarioId,
    );
    return res.json(sabana);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error obteniendo sábana de notas');
    return res.status(500).json({ error: getErrorMessage(error) || 'Error del servidor' });
  }
};

// Schema para validar actualización de calificación
const updateCalificacionSchema = z.object({
  claseId: z.string().min(1, 'claseId es requerido'),
  estudianteId: z.string().min(1, 'estudianteId es requerido'),
  periodo: z.string().min(2, 'periodo es requerido'), // Soporta p1-p4, RA1-RA10, observaciones
  valor: z.number().min(0).max(100).nullable().optional(),
  competenciaId: z.string().optional(),
  valorTexto: z.string().optional(),
});

/**
 * PATCH /sabana/calificacion
 * Actualiza una calificación específica
 */
export const updateCalificacionHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;

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

    const { claseId, estudianteId, periodo, valor, competenciaId, valorTexto } = validation.data;

    const calificacion = await updateCalificacionSabana(
      claseId,
      estudianteId,
      periodo,
      valor ?? null,
      user.usuarioId,
      user.rol,
      user.institucionId,
      competenciaId,
      valorTexto,
    );

    registrarAuditLog({
      accion: 'ACTUALIZAR',
      entidad: 'Calificacion',
      entidadId: claseId,
      descripcion:
        periodo === 'observaciones'
          ? `Observaciones actualizadas`
          : `Calificación actualizada: periodo ${periodo}, valor ${valor}`,
      datos: { claseId, estudianteId, periodo, valor, competenciaId, valorTexto },
      usuarioId: user.usuarioId,
      institucionId: user.institucionId,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'],
    });

    return res.json(calificacion);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error actualizando calificación');
    return res.status(500).json({ error: getErrorMessage(error) || 'Error del servidor' });
  }
};

// Schema para validar publicación
const publicarCalificacionesSchema = z.object({
  claseId: z.string().min(1, 'claseId es requerido'),
  cicloLectivoId: z.string().min(1, 'cicloLectivoId es requerido'),
});

/**
 * PATCH /sabana/publicar
 * Publica las calificaciones de una clase para que sean visibles por estudiantes
 */
export const publicarCalificacionesHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user?.institucionId) {
      return res.status(400).json({ error: 'Usuario sin institución asignada' });
    }

    const validation = publicarCalificacionesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      });
    }

    const { claseId, cicloLectivoId } = validation.data;

    const resultado = await publicarCalificaciones(
      claseId,
      cicloLectivoId,
      user.usuarioId,
      user.rol,
      user.institucionId,
    );

    registrarAuditLog({
      accion: 'ACTUALIZAR',
      entidad: 'Calificacion',
      entidadId: claseId,
      descripcion: `Calificaciones publicadas: ${resultado.calificacionesPublicadas} calificaciones, ${resultado.competenciasPublicadas} competencias`,
      datos: { claseId, cicloLectivoId },
      usuarioId: user.usuarioId,
      institucionId: user.institucionId,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'],
    });

    return res.json(resultado);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error publicando calificaciones');
    if (getErrorMessage(error).includes('cerrado')) {
      return res.status(400).json({ error: getErrorMessage(error) });
    }
    if (getErrorMessage(error).includes('Sin permiso')) {
      return res.status(403).json({ error: getErrorMessage(error) });
    }
    return res.status(500).json({ error: getErrorMessage(error) || 'Error del servidor' });
  }
};
