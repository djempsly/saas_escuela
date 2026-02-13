import prisma from '../config/db';
import { NotFoundError } from '../errors';

export const crearAviso = async (
  titulo: string,
  mensaje: string,
  fechaInicio: Date,
  fechaFin: Date,
  userId: string,
) => {
  return prisma.avisoMantenimiento.create({
    data: {
      titulo,
      mensaje,
      fechaInicio,
      fechaFin,
      creadoPorId: userId,
    },
  });
};

export const getAvisosActivos = async () => {
  return prisma.avisoMantenimiento.findMany({
    where: {
      activo: true,
      fechaFin: { gt: new Date() },
    },
    orderBy: { fechaInicio: 'asc' },
    include: {
      creadoPor: {
        select: { id: true, nombre: true, apellido: true },
      },
    },
  });
};

export const getAvisoActual = async () => {
  const now = new Date();

  // First try to find one currently in effect
  const vigente = await prisma.avisoMantenimiento.findFirst({
    where: {
      activo: true,
      fechaInicio: { lte: now },
      fechaFin: { gte: now },
    },
    orderBy: { fechaInicio: 'asc' },
  });

  if (vigente) return vigente;

  // Otherwise return next upcoming one
  return prisma.avisoMantenimiento.findFirst({
    where: {
      activo: true,
      fechaFin: { gt: now },
    },
    orderBy: { fechaInicio: 'asc' },
  });
};

export const cancelarAviso = async (id: string) => {
  const aviso = await prisma.avisoMantenimiento.findUnique({ where: { id } });
  if (!aviso) throw new NotFoundError('Aviso de mantenimiento no encontrado');

  return prisma.avisoMantenimiento.update({
    where: { id },
    data: { activo: false },
  });
};
