import prisma from '../config/db';
import { NivelInput } from '../utils/zod.schemas';

export const createNivel = async (input: NivelInput, institucionId: string) => {
  return prisma.nivel.create({
    data: {
      ...input,
      institucionId,
    },
  });
};

export const findNiveles = async (institucionId: string) => {
  return prisma.nivel.findMany({
    where: { institucionId },
    include: { coordinador: { select: { id: true, nombre: true, apellido: true, email: true } } },
  });
};

export const findNivelById = async (id: string, institucionId: string) => {
  return prisma.nivel.findFirst({
    where: { id, institucionId },
  });
};

export const updateNivel = async (id: string, institucionId: string, input: Partial<NivelInput>) => {
  return prisma.nivel.updateMany({
    where: { id, institucionId },
    data: input,
  });
};

export const deleteNivel = async (id: string, institucionId: string) => {
  return prisma.nivel.deleteMany({
    where: { id, institucionId },
  });
};
