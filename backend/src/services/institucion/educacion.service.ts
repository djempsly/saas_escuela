import { SistemaEducativo } from '@prisma/client';
import prisma from '../../config/db';
import { NotFoundError, ValidationError } from '../../errors';
import { getMateriasOficiales } from '../../utils/materias-oficiales';

// Actualizar sistemas educativos de una institución
export const updateSistemasEducativos = async (
  id: string,
  sistemasEducativos: SistemaEducativo[],
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
    include: { sistemasEducativos: true },
  });

  if (!institucion) {
    throw new NotFoundError('Institución no encontrada');
  }

  if (!sistemasEducativos || sistemasEducativos.length === 0) {
    throw new ValidationError('Debe proporcionar al menos un sistema educativo');
  }

  // Validar que todos los sistemas son válidos
  for (const sistema of sistemasEducativos) {
    if (!Object.values(SistemaEducativo).includes(sistema)) {
      throw new ValidationError(`Sistema educativo inválido: ${sistema}`);
    }
  }

  // Identificar sistemas nuevos para sembrar materias oficiales
  const sistemasActuales = institucion.sistemasEducativos.map((s) => s.sistema);
  const sistemasNuevos = sistemasEducativos.filter((s) => !sistemasActuales.includes(s));

  // Actualizar en transacción
  return prisma.$transaction(async (tx) => {
    // 1. Eliminar los sistemas actuales
    await tx.institucionSistemaEducativo.deleteMany({
      where: { institucionId: id },
    });

    // 2. Crear los nuevos sistemas
    for (const sistema of sistemasEducativos) {
      await tx.institucionSistemaEducativo.create({
        data: {
          institucionId: id,
          sistema,
        },
      });
    }

    // 3. Actualizar el sistema principal de la institución (el primero de la lista)
    const sistemaPrincipal = sistemasEducativos[0];
    await tx.institucion.update({
      where: { id },
      data: { sistema: sistemaPrincipal },
    });

    // 4. Sembrar materias oficiales para sistemas nuevos
    for (const sistema of sistemasNuevos) {
      const { materias, pais, provisional } = getMateriasOficiales(sistema);

      for (const materia of materias) {
        // Verificar si ya existe una materia con el mismo nombre
        const existente = await tx.materia.findFirst({
          where: {
            institucionId: id,
            nombre: materia.nombre,
          },
        });

        if (!existente) {
          await tx.materia.create({
            data: {
              nombre: materia.nombre,
              codigo: materia.codigo,
              descripcion: materia.descripcion,
              tipo: materia.tipo,
              esOficial: true,
              orden: materia.orden,
              pais,
              provisional,
              institucionId: id,
            },
          });
        }
      }
    }

    // 5. Retornar la institución actualizada
    return tx.institucion.findUnique({
      where: { id },
      include: {
        sistemasEducativos: {
          select: {
            sistema: true,
            activo: true,
          },
        },
      },
    });
  });
};

// Sembrar materias oficiales para una institución
export const seedMateriasOficiales = async (
  institucionId: string,
  sistemas?: SistemaEducativo[],
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
    include: { sistemasEducativos: true },
  });

  if (!institucion) {
    throw new NotFoundError('Institución no encontrada');
  }

  // Usar los sistemas proporcionados o los de la institución
  const sistemasToSeed = sistemas || institucion.sistemasEducativos.map((s) => s.sistema);

  const materiasCreadas: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const sistema of sistemasToSeed) {
      const { materias, pais, provisional } = getMateriasOficiales(sistema);

      for (const materia of materias) {
        // Verificar si ya existe una materia con el mismo nombre
        const existente = await tx.materia.findFirst({
          where: {
            institucionId,
            nombre: materia.nombre,
          },
        });

        if (!existente) {
          await tx.materia.create({
            data: {
              nombre: materia.nombre,
              codigo: materia.codigo,
              descripcion: materia.descripcion,
              tipo: materia.tipo,
              esOficial: true,
              orden: materia.orden,
              pais,
              provisional,
              institucionId,
            },
          });
          materiasCreadas.push(materia.nombre);
        }
      }
    }
  });

  return { materiasCreadas };
};
