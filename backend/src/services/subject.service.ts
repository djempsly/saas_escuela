import prisma from '../config/db';
import { MateriaInput } from '../utils/zod.schemas';

export const createMateria = async (input: MateriaInput, institucionId: string) => {
  return prisma.materia.create({
    data: {
      ...input,
      institucionId,
    },
  });
};

export const findMaterias = async (institucionId: string) => {
  return prisma.materia.findMany({
    where: { institucionId },
  });
};

export const findMateriaById = async (id: string, institucionId: string) => {
  return prisma.materia.findFirst({
    where: { id, institucionId },
  });
};

export const updateMateria = async (id: string, institucionId: string, input: Partial<MateriaInput>) => {
  return prisma.materia.updateMany({
    where: { id, institucionId },
    data: input,
  });
};

export const deleteMateria = async (id: string, institucionId: string) => {
  return prisma.materia.deleteMany({
    where: { id, institucionId },
  });
};
