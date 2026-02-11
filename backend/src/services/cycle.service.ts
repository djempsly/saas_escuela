import prisma from '../config/db';
import { CicloLectivoInput } from '../utils/zod.schemas';

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
