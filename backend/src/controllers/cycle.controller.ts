import { Request, Response } from 'express';
import {
  createCicloLectivo,
  findCiclosLectivos,
  findCicloLectivoById,
  updateCicloLectivo,
  deleteCicloLectivo,
  cerrarCicloLectivo,
  reabrirCicloLectivo,
} from '../services/cycle.service';
import { registrarAuditLog } from '../services/audit.service';
import { cicloLectivoSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { getErrorMessage, isZodError } from '../utils/error-helpers';

export const createCicloHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = cicloLectivoSchema.parse({ body: req.body });
    const ciclo = await createCicloLectivo(validated.body, req.resolvedInstitucionId);
    return res.status(201).json(ciclo);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCiclosHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const ciclos = await findCiclosLectivos(req.resolvedInstitucionId);
    return res.status(200).json(ciclos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCicloByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const ciclo = await findCicloLectivoById(id, req.resolvedInstitucionId);
    if (!ciclo) {
      return res.status(404).json({ message: 'Ciclo no encontrado' });
    }
    return res.status(200).json(ciclo);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateCicloHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Validar datos de entrada con schema parcial
    const updateSchema = cicloLectivoSchema.shape.body.partial();
    const validated = updateSchema.parse(req.body);

    await updateCicloLectivo(id, req.resolvedInstitucionId, validated);
    return res.status(200).json({ message: 'Ciclo actualizado' });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteCicloHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    await deleteCicloLectivo(id, req.resolvedInstitucionId);
    return res.status(204).send();
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const cerrarCicloHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const ciclo = await cerrarCicloLectivo(id, req.resolvedInstitucionId);

    registrarAuditLog({
      accion: 'CONFIG_MODIFICADA',
      entidad: 'CicloLectivo',
      entidadId: ciclo.id,
      descripcion: `Ciclo lectivo cerrado: ${ciclo.nombre}`,
      usuarioId: req.user!.usuarioId,
      institucionId: req.resolvedInstitucionId,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: 'Ciclo lectivo cerrado', ciclo });
  } catch (error: unknown) {
    if (
      getErrorMessage(error).includes('no encontrado') ||
      getErrorMessage(error).includes('ya esta cerrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const reabrirCicloHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const ciclo = await reabrirCicloLectivo(id, req.resolvedInstitucionId);

    registrarAuditLog({
      accion: 'CONFIG_MODIFICADA',
      entidad: 'CicloLectivo',
      entidadId: ciclo.id,
      descripcion: `Ciclo lectivo reabierto: ${ciclo.nombre}`,
      usuarioId: req.user!.usuarioId,
      institucionId: req.resolvedInstitucionId,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({ message: 'Ciclo lectivo reabierto', ciclo });
  } catch (error: unknown) {
    if (
      getErrorMessage(error).includes('no encontrado') ||
      getErrorMessage(error).includes('no esta cerrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
