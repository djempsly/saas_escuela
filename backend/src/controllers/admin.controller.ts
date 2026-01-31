import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import {
  createDirector,
  reassignDirector,
  getDirectorHistory,
  findAllDirectores,
} from '../services/director.service';
import { resetUserPasswordManual } from '../services/user.service';
import { sanitizeErrorMessage } from '../utils/security';
import { z } from 'zod';

// Schema de validación para crear director
const createDirectorSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    apellido: z.string().min(1, 'Apellido requerido'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    institucionId: z.string().optional(),
  }),
});

// Schema para reasignar director
const reassignDirectorSchema = z.object({
  body: z.object({
    newInstitucionId: z.string().min(1, 'Institución destino requerida'),
    motivo: z.string().optional(),
  }),
});

// GET /api/v1/admin/usuarios - Lista todos los usuarios (global)
export const getAllUsersGlobalHandler = async (req: Request, res: Response) => {
  try {
    const { institucionId, role, activo, page = '1', limit = '20' } = req.query as {
      institucionId?: string;
      role?: string;
      activo?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (institucionId) where.institucionId = institucionId;
    if (role) where.role = role as Role;
    if (activo !== undefined) where.activo = activo === 'true';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          username: true,
          role: true,
          activo: true,
          institucionId: true,
          institucion: {
            select: {
              id: true,
              nombre: true,
              slug: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/admin/usuarios/stats - Estadísticas globales
export const getUserStatsHandler = async (req: Request, res: Response) => {
  try {
    const [
      totalUsuarios,
      totalInstituciones,
      usuariosPorRol,
      usuariosActivos,
      institucionesActivas,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.institucion.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      prisma.user.count({ where: { activo: true } }),
      prisma.institucion.count({ where: { activo: true } }),
    ]);

    // Convertir a objeto más legible
    const roleStats = usuariosPorRol.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      totalUsuarios,
      totalInstituciones,
      usuariosActivos,
      institucionesActivas,
      usuariosPorRol: roleStats,
    });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/admin/directores - Crear director con password temporal
export const createDirectorHandler = async (req: Request, res: Response) => {
  try {
    const validated = createDirectorSchema.parse({ body: req.body });
    const { nombre, apellido, email, institucionId } = validated.body;

    const result = await createDirector({ nombre, apellido, email }, institucionId);

    return res.status(201).json({
      status: 'success',
      data: {
        director: {
          id: result.director.id,
          nombre: result.director.nombre,
          apellido: result.director.apellido,
          email: result.director.email,
          username: result.director.username,
        },
        tempPassword: result.tempPassword,
      },
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (error.message.includes('correo electrónico ya está en uso')) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/admin/directores - Listar todos los directores
export const getAllDirectoresHandler = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all directors...');
    const directores = await findAllDirectores();
    console.log(`Found ${directores.length} directors`);
    return res.status(200).json({ data: directores });
  } catch (error: any) {
    console.error('Error fetching directors:', error);
    return res.status(500).json({ message: error.message || sanitizeErrorMessage(error) });
  }
};

// PUT /api/v1/admin/directores/:id/reasignar - Reasignar director a otra institución
export const reassignDirectorHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const validated = reassignDirectorSchema.parse({ body: req.body });
    const { newInstitucionId, motivo } = validated.body;

    const result = await reassignDirector(id, newInstitucionId, motivo);

    return res.status(200).json({
      status: 'success',
      message: 'Director reasignado correctamente',
      data: result,
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      error.message.includes('no encontrado') ||
      error.message.includes('no tiene rol') ||
      error.message.includes('ya tiene un director')
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// GET /api/v1/admin/instituciones/:id/historial - Ver historial de directores
export const getDirectorHistoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    // Verificar que la institución existe
    const institucion = await prisma.institucion.findUnique({ where: { id } });
    if (!institucion) {
      return res.status(404).json({ message: 'Institución no encontrada' });
    }

    const historial = await getDirectorHistory(id);

    return res.status(200).json({ data: historial });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/admin/usuarios/:id/force-reset - Reset forzado de password
export const forceResetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Verificar que es ADMIN
    if (req.user.rol !== Role.ADMIN) {
      return res.status(403).json({ message: 'Solo ADMIN puede realizar reset forzado' });
    }

    const requester = {
      id: req.user.usuarioId.toString(),
      institucionId: null, // ADMIN no tiene restricción de institución
      role: req.user.rol,
    };

    const result = await resetUserPasswordManual(id, requester);

    return res.status(200).json({
      message: 'Contraseña reseteada exitosamente',
      tempPassword: result.tempPassword,
    });
  } catch (error: any) {
    if (
      error.message.includes('No tienes permisos') ||
      error.message.includes('Usuario no encontrado') ||
      error.message.includes('desactivado')
    ) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
