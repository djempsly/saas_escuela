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
    include: {
      coordinador: { select: { id: true, nombre: true, apellido: true, email: true } },
      cicloEducativo: { select: { id: true, nombre: true } },
    },
  });
};

export const findNivelById = async (id: string, institucionId: string) => {
  return prisma.nivel.findFirst({
    where: { id, institucionId },
    include: {
      cicloEducativo: { select: { id: true, nombre: true } },
    },
  });
};

export const updateNivel = async (id: string, institucionId: string, input: Partial<NivelInput & { cicloEducativoId?: string | null }>) => {
  // Extract cicloEducativoId from input
  const { cicloEducativoId, ...restInput } = input;

  // If cicloEducativoId is provided, verify it belongs to the same institution
  if (cicloEducativoId) {
    const ciclo = await prisma.cicloEducativo.findFirst({
      where: { id: cicloEducativoId, institucionId },
    });
    if (!ciclo) {
      throw new Error('Ciclo educativo no encontrado');
    }
  }

  return prisma.nivel.updateMany({
    where: { id, institucionId },
    data: {
      ...restInput,
      ...(cicloEducativoId !== undefined && { cicloEducativoId }),
    },
  });
};

export const deleteNivel = async (id: string, institucionId: string) => {
  return prisma.nivel.deleteMany({
    where: { id, institucionId },
  });
};

export const assignNivelToCicloEducativo = async (
  nivelId: string,
  cicloEducativoId: string | null,
  institucionId: string
) => {
  // Verify nivel belongs to institution
  const nivel = await prisma.nivel.findFirst({
    where: { id: nivelId, institucionId },
  });
  if (!nivel) {
    throw new Error('Nivel no encontrado');
  }

  // If assigning to a ciclo, verify it belongs to same institution
  if (cicloEducativoId) {
    const ciclo = await prisma.cicloEducativo.findFirst({
      where: { id: cicloEducativoId, institucionId },
    });
    if (!ciclo) {
      throw new Error('Ciclo educativo no encontrado');
    }
  }

  return prisma.nivel.update({
    where: { id: nivelId },
    data: { cicloEducativoId },
    include: {
      cicloEducativo: { select: { id: true, nombre: true } },
    },
  });
};
