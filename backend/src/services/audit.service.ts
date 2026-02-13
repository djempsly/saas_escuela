import { AccionAudit, Prisma } from '@prisma/client';
import prisma from '../config/db';
import { logger } from '../config/logger';

interface AuditLogParams {
  accion: AccionAudit;
  entidad: string;
  entidadId?: string;
  descripcion: string;
  datos?: Prisma.InputJsonValue;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  usuarioId: string;
  institucionId?: string;
}

/**
 * Fire-and-forget audit log. Never fails the main flow.
 */
export const registrarAuditLog = (params: AuditLogParams): void => {
  prisma.auditLog
    .create({
      data: {
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId || null,
        descripcion: params.descripcion,
        datos: params.datos || undefined,
        oldValue: params.oldValue || undefined,
        newValue: params.newValue || undefined,
        ipAddress: params.ipAddress || undefined,
        userAgent: params.userAgent || undefined,
        usuarioId: params.usuarioId,
        institucionId: params.institucionId || undefined,
      },
    })
    .catch((err) => {
      logger.error({ err }, 'Error registrando audit log');
    });
};

const DIRECTOR_ALLOWED_ACTIONS: AccionAudit[] = [
  'CREAR',
  'ACTUALIZAR',
  'ELIMINAR',
  'IMPORTAR',
  'CALIFICACION_PUBLICADA',
  'CONFIG_MODIFICADA',
];

interface GetAuditLogsParams {
  rol: string;
  institucionId?: string;
  page?: number;
  limit?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioId?: string;
  entidad?: string;
  entidadId?: string;
  accion?: AccionAudit;
}

export const getAuditLogs = async (params: GetAuditLogsParams) => {
  const {
    rol,
    institucionId,
    page = 1,
    limit = 50,
    fechaDesde,
    fechaHasta,
    usuarioId,
    entidad,
    entidadId,
    accion,
  } = params;

  const where: Prisma.AuditLogWhereInput = {};

  // ADMIN: ve todo. DIRECTOR: solo su institucion + acciones academicas
  if (rol === 'DIRECTOR') {
    where.institucionId = institucionId;
    where.accion = { in: DIRECTOR_ALLOWED_ACTIONS };
  } else if (rol === 'ADMIN' && institucionId) {
    where.institucionId = institucionId;
  }

  if (fechaDesde || fechaHasta) {
    where.createdAt = {};
    if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
    if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
  }

  if (usuarioId) where.usuarioId = usuarioId;
  if (entidad) where.entidad = entidad;
  if (entidadId) where.entidadId = entidadId;
  if (accion) {
    // For DIRECTOR, intersect with allowed actions
    if (rol === 'DIRECTOR') {
      if (DIRECTOR_ALLOWED_ACTIONS.includes(accion)) {
        where.accion = accion;
      }
      // else keep the `in` filter already set
    } else {
      where.accion = accion;
    }
  }

  const safeLimit = Math.min(limit, 200);
  const skip = (page - 1) * safeLimit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};
