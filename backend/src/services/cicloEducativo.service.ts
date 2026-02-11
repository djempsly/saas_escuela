import { TipoCicloEducativo } from '@prisma/client';
import prisma from '../config/db';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize';
import { NotFoundError, ValidationError } from '../errors';

export interface CicloEducativoInput {
  nombre: string;
  descripcion?: string;
  orden?: number;
  tipo?: TipoCicloEducativo;
}

export const createCicloEducativo = async (input: CicloEducativoInput, institucionId: string) => {
  return prisma.cicloEducativo.create({
    data: {
      nombre: sanitizeText(input.nombre),
      descripcion: sanitizeOptional(input.descripcion),
      orden: input.orden || 1,
      tipo: input.tipo,
      institucionId,
    },
    include: {
      niveles: true,
      coordinadores: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
    },
  });
};

export const findCiclosEducativos = async (institucionId: string) => {
  return prisma.cicloEducativo.findMany({
    where: { institucionId },
    include: {
      niveles: {
        select: { id: true, nombre: true },
      },
      coordinadores: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
    },
    orderBy: { orden: 'asc' },
  });
};

export const findCicloEducativoById = async (id: string, institucionId: string) => {
  return prisma.cicloEducativo.findFirst({
    where: { id, institucionId },
    include: {
      niveles: {
        select: { id: true, nombre: true },
      },
      coordinadores: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
    },
  });
};

export const updateCicloEducativo = async (
  id: string,
  institucionId: string,
  input: Partial<CicloEducativoInput>,
) => {
  // First verify it belongs to the institution
  const existing = await prisma.cicloEducativo.findFirst({
    where: { id, institucionId },
  });
  if (!existing) {
    throw new NotFoundError('Ciclo educativo no encontrado');
  }

  return prisma.cicloEducativo.update({
    where: { id },
    data: {
      ...(input.nombre && { nombre: sanitizeText(input.nombre) }),
      ...(input.descripcion !== undefined && { descripcion: sanitizeOptional(input.descripcion) }),
      ...(input.orden !== undefined && { orden: input.orden }),
      ...(input.tipo !== undefined && { tipo: input.tipo }),
    },
    include: {
      niveles: {
        select: { id: true, nombre: true },
      },
      coordinadores: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
    },
  });
};

export const deleteCicloEducativo = async (id: string, institucionId: string) => {
  // First verify it belongs to the institution
  const existing = await prisma.cicloEducativo.findFirst({
    where: { id, institucionId },
  });
  if (!existing) {
    throw new NotFoundError('Ciclo educativo no encontrado');
  }

  // Remove association from niveles first
  await prisma.nivel.updateMany({
    where: { cicloEducativoId: id },
    data: { cicloEducativoId: null },
  });

  return prisma.cicloEducativo.delete({
    where: { id },
  });
};

export const assignNivelesACiclo = async (
  cicloId: string,
  nivelIds: string[],
  institucionId: string,
) => {
  // Verify the ciclo exists and belongs to the institution
  const ciclo = await prisma.cicloEducativo.findFirst({
    where: { id: cicloId, institucionId },
  });
  if (!ciclo) {
    throw new NotFoundError('Ciclo educativo no encontrado');
  }

  // First, remove all niveles from this ciclo
  await prisma.nivel.updateMany({
    where: { cicloEducativoId: cicloId },
    data: { cicloEducativoId: null },
  });

  // Then assign the new niveles
  if (nivelIds.length > 0) {
    await prisma.nivel.updateMany({
      where: {
        id: { in: nivelIds },
        institucionId,
      },
      data: { cicloEducativoId: cicloId },
    });
  }

  return findCicloEducativoById(cicloId, institucionId);
};

export const assignCoordinadoresACiclo = async (
  cicloId: string,
  coordinadorIds: string[],
  institucionId: string,
) => {
  // Verify the ciclo exists and belongs to the institution
  const ciclo = await prisma.cicloEducativo.findFirst({
    where: { id: cicloId, institucionId },
  });
  if (!ciclo) {
    throw new NotFoundError('Ciclo educativo no encontrado');
  }

  // Verify all coordinators belong to the same institution
  const coordinadores = await prisma.user.findMany({
    where: {
      id: { in: coordinadorIds },
      institucionId,
      role: { in: ['COORDINADOR', 'COORDINADOR_ACADEMICO'] },
    },
  });

  if (coordinadores.length !== coordinadorIds.length) {
    throw new ValidationError('Algunos coordinadores no son válidos');
  }

  // Update the ciclo with new coordinators
  return prisma.cicloEducativo.update({
    where: { id: cicloId },
    data: {
      coordinadores: {
        set: coordinadorIds.map((id) => ({ id })),
      },
    },
    include: {
      niveles: {
        select: { id: true, nombre: true },
      },
      coordinadores: {
        select: { id: true, nombre: true, apellido: true, email: true },
      },
    },
  });
};
