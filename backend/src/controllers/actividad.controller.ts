import { Request, Response } from 'express';
import {
  createActividad,
  findAllActividades,
  findActividadById,
  updateActividad,
  deleteActividad,
  searchActividades,
} from '../services/actividad.service';
import { actividadSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { getFileUrl } from '../middleware/upload.middleware';

export const createActividadHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const validated = actividadSchema.parse({ body: req.body });

    // Procesar archivos subidos
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let urlImagen: string | undefined;
    let urlVideo: string | undefined;

    if (files) {
      if (files.imagen && files.imagen[0]) {
        urlImagen = getFileUrl(files.imagen[0]);
      }
      if (files.video && files.video[0]) {
        urlVideo = getFileUrl(files.video[0]);
      }
    }

    const actividad = await createActividad(
      {
        ...validated.body,
        urlImagen,
        urlVideo,
      },
      req.user.usuarioId.toString()
    );

    return res.status(201).json(actividad);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getActividadesHandler = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query as { limit?: string };
    const actividades = await findAllActividades(limit ? parseInt(limit) : undefined);
    return res.status(200).json(actividades);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getActividadByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const actividad = await findActividadById(id);
    if (!actividad) {
      return res.status(404).json({ message: 'Actividad no encontrada' });
    }
    return res.status(200).json(actividad);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateActividadHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    const updateSchema = actividadSchema.shape.body.partial();
    const validated = updateSchema.parse(req.body);

    // Procesar archivos subidos
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let urlImagen: string | undefined;
    let urlVideo: string | undefined;

    if (files) {
      if (files.imagen && files.imagen[0]) {
        urlImagen = getFileUrl(files.imagen[0]);
      }
      if (files.video && files.video[0]) {
        urlVideo = getFileUrl(files.video[0]);
      }
    }

    const actividad = await updateActividad(id, {
      ...validated,
      urlImagen,
      urlVideo,
    });

    return res.status(200).json(actividad);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const deleteActividadHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    await deleteActividad(id);
    return res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('no encontrada')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const searchActividadesHandler = async (req: Request, res: Response) => {
  try {
    const { q, limit } = req.query as { q?: string; limit?: string };
    if (!q) {
      return res.status(400).json({ message: 'Parámetro de búsqueda (q) requerido' });
    }
    const actividades = await searchActividades(q, limit ? parseInt(limit) : undefined);
    return res.status(200).json(actividades);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
