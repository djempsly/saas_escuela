import prisma from '../../config/db';
import { NotFoundError, ValidationError } from '../../errors';
import { getErrorMessage } from '../../utils/error-helpers';
import { invalidarCacheSabana } from '../sabana';

interface DesinscribirResult {
  estudianteId: string;
  nivelId: string;
  inscripcionesDesactivadas: number;
}

interface DesinscribirMasivoResult {
  exitosos: DesinscribirResult[];
  fallidos: Array<{ estudianteId: string; error: string }>;
}

interface ReactivarResult {
  estudianteId: string;
  nivelId: string;
  inscripcionesReactivadas: number;
}

const invalidarCachesAfectados = async (nivelId: string, institucionId: string) => {
  const clases = await prisma.clase.findMany({
    where: { nivelId, institucionId },
    select: { cicloLectivoId: true },
    distinct: ['cicloLectivoId'],
  });
  for (const clase of clases) {
    await invalidarCacheSabana(nivelId, clase.cicloLectivoId);
  }
};

export const desinscribir = async (
  estudianteId: string,
  nivelId: string,
  institucionId: string,
): Promise<DesinscribirResult> => {
  // 1. Verificar estudiante
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
    select: { id: true },
  });
  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado o no pertenece a la institucion');
  }

  // 2. Verificar nivel
  const nivel = await prisma.nivel.findFirst({
    where: { id: nivelId, institucionId },
    select: { id: true },
  });
  if (!nivel) {
    throw new NotFoundError('Nivel no encontrado');
  }

  // 3. Buscar inscripciones activas del estudiante en ese nivel
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      estudianteId,
      activa: true,
      clase: { nivelId, institucionId },
    },
    select: { id: true },
  });

  if (inscripciones.length === 0) {
    throw new ValidationError('El estudiante no tiene inscripciones activas en este nivel');
  }

  // 4. Marcar como inactivas
  const resultado = await prisma.inscripcion.updateMany({
    where: { id: { in: inscripciones.map((i) => i.id) } },
    data: { activa: false },
  });

  // 5. Invalidar cache sabana
  await invalidarCachesAfectados(nivelId, institucionId);

  return {
    estudianteId,
    nivelId,
    inscripcionesDesactivadas: resultado.count,
  };
};

export const desinscribirMasivo = async (
  estudianteIds: string[],
  nivelId: string,
  institucionId: string,
): Promise<DesinscribirMasivoResult> => {
  // Verificar nivel
  const nivel = await prisma.nivel.findFirst({
    where: { id: nivelId, institucionId },
    select: { id: true },
  });
  if (!nivel) {
    throw new NotFoundError('Nivel no encontrado');
  }

  const exitosos: DesinscribirResult[] = [];
  const fallidos: Array<{ estudianteId: string; error: string }> = [];

  for (const estudianteId of estudianteIds) {
    try {
      const result = await desinscribir(estudianteId, nivelId, institucionId);
      exitosos.push(result);
    } catch (error: unknown) {
      fallidos.push({ estudianteId, error: getErrorMessage(error) });
    }
  }

  return { exitosos, fallidos };
};

export const reactivar = async (
  estudianteId: string,
  nivelId: string,
  institucionId: string,
): Promise<ReactivarResult> => {
  // 1. Verificar estudiante
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
    select: { id: true },
  });
  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado');
  }

  // 2. Verificar nivel
  const nivel = await prisma.nivel.findFirst({
    where: { id: nivelId, institucionId },
    select: { id: true },
  });
  if (!nivel) {
    throw new NotFoundError('Nivel no encontrado');
  }

  // 3. Buscar inscripciones inactivas
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      estudianteId,
      activa: false,
      clase: { nivelId, institucionId },
    },
    select: { id: true },
  });

  if (inscripciones.length === 0) {
    throw new ValidationError('El estudiante no tiene inscripciones inactivas en este nivel');
  }

  // 4. Reactivar
  const resultado = await prisma.inscripcion.updateMany({
    where: { id: { in: inscripciones.map((i) => i.id) } },
    data: { activa: true },
  });

  // 5. Invalidar cache sabana
  await invalidarCachesAfectados(nivelId, institucionId);

  return {
    estudianteId,
    nivelId,
    inscripcionesReactivadas: resultado.count,
  };
};
