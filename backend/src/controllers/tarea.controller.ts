import { Request, Response } from 'express';
import {
  crearTarea,
  actualizarTarea,
  eliminarTarea,
  getTareas,
  getTareaById,
  agregarRecurso,
  entregarTarea,
  calificarEntrega,
  getEntregasTarea,
} from '../services/tarea.service';
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

export const crearTareaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const tarea = await crearTarea(
      req.body,
      getUserId(req),
      getInstitucionId(req)
    );

    return res.status(201).json(tarea);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('Solo el docente')) {
      return res.status(400).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const actualizarTareaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const tarea = await actualizarTarea(
      id,
      req.body,
      getUserId(req),
      getInstitucionId(req)
    );

    return res.status(200).json(tarea);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('Solo el docente')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const eliminarTareaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    await eliminarTarea(id, getUserId(req), getInstitucionId(req));

    return res.status(200).json({ message: 'Tarea eliminada exitosamente' });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('Solo el docente')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getTareasHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const { claseId } = req.query as { claseId?: string };
    const tareas = await getTareas(
      getUserId(req),
      getUserRole(req),
      getInstitucionId(req),
      claseId
    );

    return res.status(200).json(tareas);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getTareaByIdHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const tarea = await getTareaById(
      id,
      getUserId(req),
      getUserRole(req),
      getInstitucionId(req)
    );

    return res.status(200).json(tarea);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('no disponible')) {
      return res.status(404).json({ message: err.message });
    }
    if (err.message.includes('No autorizado') || err.message.includes('No estás inscrito')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const agregarRecursoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const recurso = await agregarRecurso(
      id,
      req.body,
      getUserId(req),
      getInstitucionId(req)
    );

    return res.status(201).json(recurso);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('Solo el docente')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const entregarTareaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const entrega = await entregarTarea(
      id,
      req.body,
      getUserId(req),
      getInstitucionId(req)
    );

    return res.status(200).json(entrega);
  } catch (error: unknown) {
    const err = error as Error;
    if (
      err.message.includes('no encontrada') ||
      err.message.includes('no acepta') ||
      err.message.includes('No estás inscrito')
    ) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const calificarEntregaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const entregaId = String(req.params.entregaId);
    const entrega = await calificarEntrega(
      entregaId,
      req.body,
      getUserId(req),
      getInstitucionId(req)
    );

    return res.status(200).json(entrega);
  } catch (error: unknown) {
    const err = error as Error;
    if (
      err.message.includes('no encontrada') ||
      err.message.includes('Solo el docente') ||
      err.message.includes('calificación')
    ) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getEntregasTareaHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const id = String(req.params.id);
    const entregas = await getEntregasTarea(
      id,
      getUserId(req),
      getInstitucionId(req)
    );

    return res.status(200).json(entregas);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('no encontrada') || err.message.includes('Solo el docente')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message.includes('No autorizado')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
