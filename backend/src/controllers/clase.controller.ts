import { Request, Response } from 'express';
import {
  createClase,
  findClases,
  findClaseById,
  findClaseByCodigo,
  updateClase,
  deleteClase,
  findClasesByDocente,
  findClasesByNiveles,
} from '../services/clase.service';
import { claseSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { Role } from '@prisma/client';
import { getCoordinadorNivelIds } from '../utils/coordinador.utils';
import { registrarAuditLog } from '../services/audit.service';

export const createClaseHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = claseSchema.parse({ body: req.body });
    const clase = await createClase(validated.body, req.resolvedInstitucionId);
    if (req.user) {
      registrarAuditLog({
        accion: 'CREAR',
        entidad: 'Clase',
        entidadId: clase.id,
        descripcion: `Clase creada: ${clase.materia.nombre} - ${clase.nivel.nombre}`,
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
      });
    }
    return res.status(201).json(clase);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrad') || error.message.includes('no pertenece') || error.message.includes('Ya existe') || error.message.includes('ya existe')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getClasesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Si es docente, solo ver sus clases
    if (req.user?.rol === Role.DOCENTE) {
      const clases = await findClasesByDocente(req.user.usuarioId.toString(), req.resolvedInstitucionId);
      return res.status(200).json(clases);
    }

    // Si es coordinador, solo ver clases de sus niveles asignados
    if (req.user?.rol === Role.COORDINADOR) {
      const nivelIds = await getCoordinadorNivelIds(req.user.usuarioId.toString());
      const clases = await findClasesByNiveles(nivelIds, req.resolvedInstitucionId);
      return res.status(200).json(clases);
    }

    const clases = await findClases(req.resolvedInstitucionId);
    return res.status(200).json(clases);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getClaseByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const clase = await findClaseById(id, req.resolvedInstitucionId);
    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }
    return res.status(200).json(clase);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getClaseByCodigoHandler = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params as { codigo: string };
    const clase = await findClaseByCodigo(codigo);
    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }
    return res.status(200).json(clase);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateClaseHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const updateSchema = claseSchema.shape.body.partial();
    const validated = updateSchema.parse(req.body);

    await updateClase(id, req.resolvedInstitucionId, validated);
    if (req.user) {
      registrarAuditLog({
        accion: 'ACTUALIZAR',
        entidad: 'Clase',
        entidadId: id,
        descripcion: `Clase actualizada`,
        datos: validated,
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
      });
    }
    return res.status(200).json({ message: 'Clase actualizada' });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrad')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteClaseHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    await deleteClase(id, req.resolvedInstitucionId);
    if (req.user) {
      registrarAuditLog({
        accion: 'ELIMINAR',
        entidad: 'Clase',
        entidadId: id,
        descripcion: `Clase eliminada`,
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
      });
    }
    return res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('No se puede eliminar')) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
