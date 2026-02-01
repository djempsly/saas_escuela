import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import {
  createActividad,
  findAllActividades,
  findActividadById,
  updateActividad,
  deleteActividad,
  searchActividades,
  findActividadesBySlug,
  findActividadesByInstitucion,
  canDirectorCreateActividad,
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

    // Determinar institucionId basado en el rol
    let institucionId: string | null = null;

    if (req.user.rol === Role.ADMIN) {
      // ADMIN puede crear actividades globales (sin institucionId)
      // o especificar una institución
      institucionId = req.body.institucionId || null;
    } else if (req.user.rol === Role.DIRECTOR) {
      // DIRECTOR solo puede crear para su institución si tiene autogestion
      if (!req.user.institucionId) {
        return res.status(403).json({ message: 'No tienes institución asignada' });
      }

      const canCreate = await canDirectorCreateActividad(req.user.institucionId);
      if (!canCreate) {
        return res.status(403).json({
          message: 'Tu institución no tiene habilitada la autogestión de actividades',
        });
      }

      institucionId = req.user.institucionId;
    } else {
      return res.status(403).json({ message: 'No tienes permisos para crear actividades' });
    }

    // Procesar archivos subidos
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const fotos: string[] = [];
    const videos: string[] = [];

    if (files) {
      // Procesar múltiples imágenes subidas
      if (files.imagenes) {
        files.imagenes.forEach((file) => {
          fotos.push(getFileUrl(file));
        });
      }
      // Procesar video subido
      if (files.video && files.video[0]) {
        videos.push(getFileUrl(files.video[0]));
      }
    }

    // Procesar URLs de imágenes proporcionadas
    if (req.body.fotosUrls) {
      try {
        const urls = JSON.parse(req.body.fotosUrls);
        if (Array.isArray(urls)) {
          fotos.push(...urls.filter((url: string) => url && url.trim()));
        }
      } catch {
        // Si no es JSON válido, intentar como string separado por comas
        if (typeof req.body.fotosUrls === 'string') {
          const urls = req.body.fotosUrls.split(',').map((u: string) => u.trim()).filter(Boolean);
          fotos.push(...urls);
        }
      }
    }

    // Procesar URL de video proporcionada
    if (req.body.videoUrl && req.body.videoUrl.trim()) {
      videos.push(req.body.videoUrl.trim());
    }

    const actividad = await createActividad(
      {
        ...validated.body,
        fotos: fotos.length > 0 ? fotos : undefined,
        videos: videos.length > 0 ? videos : undefined,
        publicado: req.body.publicado !== undefined ? req.body.publicado : true,
      },
      req.user.usuarioId.toString(),
      institucionId
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
    const fotos: string[] = [];
    const videos: string[] = [];

    if (files) {
      // Procesar múltiples imágenes subidas
      if (files.imagenes) {
        files.imagenes.forEach((file) => {
          fotos.push(getFileUrl(file));
        });
      }
      // Procesar video subido
      if (files.video && files.video[0]) {
        videos.push(getFileUrl(files.video[0]));
      }
    }

    // Procesar URLs de imágenes proporcionadas
    if (req.body.fotosUrls) {
      try {
        const urls = JSON.parse(req.body.fotosUrls);
        if (Array.isArray(urls)) {
          fotos.push(...urls.filter((url: string) => url && url.trim()));
        }
      } catch {
        if (typeof req.body.fotosUrls === 'string') {
          const urls = req.body.fotosUrls.split(',').map((u: string) => u.trim()).filter(Boolean);
          fotos.push(...urls);
        }
      }
    }

    // Procesar URL de video proporcionada
    if (req.body.videoUrl && req.body.videoUrl.trim()) {
      videos.push(req.body.videoUrl.trim());
    }

    // Mantener fotos/videos existentes si se proporcionan
    if (req.body.fotosExistentes) {
      try {
        const existentes = JSON.parse(req.body.fotosExistentes);
        if (Array.isArray(existentes)) {
          fotos.unshift(...existentes);
        }
      } catch { /* ignorar */ }
    }

    if (req.body.videosExistentes) {
      try {
        const existentes = JSON.parse(req.body.videosExistentes);
        if (Array.isArray(existentes)) {
          videos.unshift(...existentes);
        }
      } catch { /* ignorar */ }
    }

    const actividad = await updateActividad(id, {
      ...validated,
      fotos: fotos.length > 0 ? fotos : undefined,
      videos: videos.length > 0 ? videos : undefined,
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
    const { q, limit, institucionId } = req.query as { q?: string; limit?: string; institucionId?: string };
    if (!q) {
      return res.status(400).json({ message: 'Parámetro de búsqueda (q) requerido' });
    }
    const actividades = await searchActividades(
      q,
      limit ? parseInt(limit) : undefined,
      institucionId || null
    );
    return res.status(200).json(actividades);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/actividades/institucion/:slug - Obtener actividades por slug de institución (público)
export const getActividadesBySlugHandler = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params as { slug: string };
    const { limit } = req.query as { limit?: string };

    const actividades = await findActividadesBySlug(slug, limit ? parseInt(limit) : undefined);

    return res.status(200).json(actividades);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/actividades/institucion-id/:id - Obtener actividades por ID de institución
export const getActividadesByInstitucionHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { limit } = req.query as { limit?: string };

    const actividades = await findActividadesByInstitucion(id, limit ? parseInt(limit) : undefined);

    return res.status(200).json(actividades);
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
