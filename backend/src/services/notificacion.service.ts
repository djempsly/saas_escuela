import prisma from '../config/db';
import { sanitizeText } from '../utils/sanitize';

export const getNotificaciones = async (
  usuarioId: string,
  limit: number = 20,
  offset: number = 0,
) => {
  const [notificaciones, total] = await Promise.all([
    prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notificacion.count({ where: { usuarioId } }),
  ]);

  return { notificaciones, total };
};

export const getNoLeidas = async (usuarioId: string) => {
  const count = await prisma.notificacion.count({
    where: { usuarioId, leida: false },
  });
  return { count };
};

export const marcarComoLeida = async (id: string, usuarioId: string) => {
  const notificacion = await prisma.notificacion.findFirst({
    where: { id, usuarioId },
  });

  if (!notificacion) {
    throw new Error('Notificación no encontrada');
  }

  return prisma.notificacion.update({
    where: { id },
    data: { leida: true },
  });
};

export const marcarTodasComoLeidas = async (usuarioId: string) => {
  return prisma.notificacion.updateMany({
    where: { usuarioId, leida: false },
    data: { leida: true },
  });
};

export const crearNotificacionesMasivas = async (
  usuarioIds: string[],
  titulo: string,
  mensaje: string,
) => {
  if (usuarioIds.length === 0) return { count: 0 };

  return prisma.notificacion.createMany({
    data: usuarioIds.map((usuarioId) => ({
      titulo: sanitizeText(titulo),
      mensaje: sanitizeText(mensaje),
      usuarioId,
    })),
  });
};
