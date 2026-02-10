import { AccionAudit, Prisma } from '@prisma/client';
import prisma from '../config/db';
import { logger } from '../config/logger';

interface AuditLogParams {
  accion: AccionAudit;
  entidad: string;
  entidadId?: string;
  descripcion: string;
  datos?: Prisma.InputJsonValue;
  usuarioId: string;
  institucionId: string;
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
        usuarioId: params.usuarioId,
        institucionId: params.institucionId,
      },
    })
    .catch((err) => {
      logger.error({ err }, 'Error registrando audit log');
    });
};

interface GetAuditLogsParams {
  institucionId: string;
  page?: number;
  limit?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  usuarioId?: string;
  entidad?: string;
  accion?: AccionAudit;
}

export const getAuditLogs = async (params: GetAuditLogsParams) => {
  const {
    institucionId,
    page = 1,
    limit = 50,
    fechaDesde,
    fechaHasta,
    usuarioId,
    entidad,
    accion,
  } = params;

  const where: any = { institucionId };

  if (fechaDesde || fechaHasta) {
    where.createdAt = {};
    if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
    if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
  }

  if (usuarioId) where.usuarioId = usuarioId;
  if (entidad) where.entidad = entidad;
  if (accion) where.accion = accion;

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
