import prisma from '../config/db';
import { NivelInput } from '../utils/zod.schemas';
import { NotFoundError } from '../errors';
import { determinarFormatoSabana } from '../utils/formato-sabana';

/**
 * Resuelve los campos de formatoSabana para un nivel a partir de su cicloEducativo.
 * Si el admin proporcionó formatoSabana manualmente, se respeta.
 * Si no, se auto-asigna según cicloEducativo + sistema de institución.
 */
async function resolverFormato(
  cicloEducativoId: string | undefined | null,
  institucionId: string,
  formatoManual?: string,
) {
  // Si el admin pasó formato manual, respetarlo
  if (formatoManual) return {};

  // Si no hay cicloEducativoId, no se puede determinar
  if (!cicloEducativoId) return {};

  const ciclo = await prisma.cicloEducativo.findFirst({
    where: { id: cicloEducativoId, institucionId },
    select: { nombre: true, tipo: true },
  });
  if (!ciclo) return {};

  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
    select: { sistema: true },
  });
  if (!institucion) return {};

  const resultado = determinarFormatoSabana(ciclo, institucion.sistema);
  if (!resultado) return {};

  return resultado;
}

export const createNivel = async (input: NivelInput, institucionId: string) => {
  const { formatoSabana: formatoManual, ...restInput } = input;

  // Auto-asignar formato si no se proporcionó manualmente
  const formatoAuto = await resolverFormato(
    input.cicloEducativoId,
    institucionId,
    formatoManual,
  );

  return prisma.nivel.create({
    data: {
      ...restInput,
      institucionId,
      ...(formatoManual ? { formatoSabana: formatoManual } : formatoAuto),
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

export const updateNivel = async (
  id: string,
  institucionId: string,
  input: Partial<NivelInput & { cicloEducativoId?: string | null }>,
) => {
  const { cicloEducativoId, formatoSabana: formatoManual, ...restInput } = input;

  // If cicloEducativoId is provided, verify it belongs to the same institution
  if (cicloEducativoId) {
    const ciclo = await prisma.cicloEducativo.findFirst({
      where: { id: cicloEducativoId, institucionId },
    });
    if (!ciclo) {
      throw new NotFoundError('Ciclo educativo no encontrado');
    }
  }

  // Auto-asignar formato si se cambia el cicloEducativo y no se pasa formato manual
  const formatoAuto = cicloEducativoId
    ? await resolverFormato(cicloEducativoId, institucionId, formatoManual)
    : {};

  return prisma.nivel.updateMany({
    where: { id, institucionId },
    data: {
      ...restInput,
      ...(cicloEducativoId !== undefined && { cicloEducativoId }),
      ...(formatoManual ? { formatoSabana: formatoManual } : formatoAuto),
    },
  });
};

export const deleteNivel = async (id: string, institucionId: string) => {
  return prisma.nivel.deleteMany({
    where: { id, institucionId },
  });
};
