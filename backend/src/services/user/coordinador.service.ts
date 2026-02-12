import { Role } from '@prisma/client';
import prisma from '../../config/db';
import { NotFoundError, ValidationError } from '../../errors';

export const getCoordinacionInfo = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: {
          id: true,
          nombre: true,
          niveles: {
            select: { id: true, nombre: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return {
    nivelesCoordinados: user.coordinadorDe,
    ciclosEducativosCoordinados: user.coordinadorCiclosEducativos,
  };
};

export const findCoordinadores = async (institucionId: string) => {
  return prisma.user.findMany({
    where: {
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO] },
    },
    select: {
      id: true,
      nombre: true,
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
};

export const assignCiclosToCoordinator = async (
  userId: string,
  cicloIds: string[],
  institucionId: string,
) => {
  // Verify user exists and is a coordinator
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO] },
    },
  });

  if (!user) {
    throw new NotFoundError('Coordinador no encontrado');
  }

  // Verify all ciclos belong to the same institution
  if (cicloIds.length > 0) {
    const ciclos = await prisma.cicloEducativo.findMany({
      where: { id: { in: cicloIds }, institucionId },
    });
    if (ciclos.length !== cicloIds.length) {
      throw new ValidationError('Algunos ciclos educativos no son válidos');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      coordinadorCiclosEducativos: {
        set: cicloIds.map((id) => ({ id })),
      },
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: { id: true, nombre: true },
      },
    },
  });
};

export const assignNivelesToCoordinator = async (
  userId: string,
  nivelIds: string[],
  institucionId: string,
) => {
  // Verify user exists and is a coordinator
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO] },
    },
  });

  if (!user) {
    throw new NotFoundError('Coordinador no encontrado');
  }

  // First, remove this coordinator from all niveles
  await prisma.nivel.updateMany({
    where: { coordinadorId: userId },
    data: { coordinadorId: null },
  });

  // Then assign the new niveles
  if (nivelIds.length > 0) {
    await prisma.nivel.updateMany({
      where: { id: { in: nivelIds }, institucionId },
      data: { coordinadorId: userId },
    });
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: { id: true, nombre: true },
      },
    },
  });
};
