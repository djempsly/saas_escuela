import prisma from '../config/db';

/**
 * Returns the set of nivel IDs that a coordinator has access to.
 * Combines:
 * 1. Direct niveles (where coordinadorId = userId)
 * 2. Niveles from CicloEducativos where the user is assigned as coordinator
 */
export const getCoordinadorNivelIds = async (coordinadorId: string): Promise<string[]> => {
  const [directNiveles, ciclosEducativos] = await Promise.all([
    prisma.nivel.findMany({
      where: { coordinadorId },
      select: { id: true },
    }),
    prisma.cicloEducativo.findMany({
      where: { coordinadores: { some: { id: coordinadorId } } },
      select: { niveles: { select: { id: true } } },
    }),
  ]);

  const nivelIds = new Set<string>();

  for (const n of directNiveles) {
    nivelIds.add(n.id);
  }

  for (const ciclo of ciclosEducativos) {
    for (const n of ciclo.niveles) {
      nivelIds.add(n.id);
    }
  }

  return Array.from(nivelIds);
};
