import prisma from '../config/db';
import { NotFoundError, ValidationError } from '../errors';
import { CicloLectivoInput } from '../utils/zod.schemas';

/**
 * Helper reutilizable: lanza ValidationError si el ciclo esta cerrado.
 * Usado por calificacion, sabana, inscripcion y clase services.
 */
export const verificarCicloNoCerrado = (cicloLectivo: { cerrado: boolean }) => {
  if (cicloLectivo.cerrado) {
    throw new ValidationError('El ciclo lectivo esta cerrado. No se permiten modificaciones.');
  }
};

export const createCicloLectivo = async (input: CicloLectivoInput, institucionId: string) => {
  return prisma.cicloLectivo.create({
    data: {
      ...input,
      institucionId,
    },
  });
};

export const findCiclosLectivos = async (institucionId: string) => {
  return prisma.cicloLectivo.findMany({
    where: { institucionId },
    orderBy: { fechaInicio: 'desc' },
  });
};

export const findCicloLectivoById = async (id: string, institucionId: string) => {
  return prisma.cicloLectivo.findFirst({
    where: { id, institucionId },
  });
};

export const updateCicloLectivo = async (
  id: string,
  institucionId: string,
  input: Partial<CicloLectivoInput>,
) => {
  return prisma.cicloLectivo.updateMany({
    where: { id, institucionId },
    data: input,
  });
};

export const deleteCicloLectivo = async (id: string, institucionId: string) => {
  return prisma.cicloLectivo.deleteMany({
    where: { id, institucionId },
  });
};

export const cerrarCicloLectivo = async (id: string, institucionId: string) => {
  const ciclo = await prisma.cicloLectivo.findFirst({
    where: { id, institucionId },
    select: { id: true, cerrado: true, nombre: true },
  });

  if (!ciclo) throw new NotFoundError('Ciclo lectivo no encontrado');
  if (ciclo.cerrado) throw new ValidationError('El ciclo lectivo ya esta cerrado');

  return prisma.cicloLectivo.update({
    where: { id },
    data: { cerrado: true, cerradoAt: new Date() },
  });
};

export const reabrirCicloLectivo = async (id: string, institucionId: string) => {
  const ciclo = await prisma.cicloLectivo.findFirst({
    where: { id, institucionId },
    select: { id: true, cerrado: true, nombre: true },
  });

  if (!ciclo) throw new NotFoundError('Ciclo lectivo no encontrado');
  if (!ciclo.cerrado) throw new ValidationError('El ciclo lectivo no esta cerrado');

  return prisma.cicloLectivo.update({
    where: { id },
    data: { cerrado: false, cerradoAt: null },
  });
};
