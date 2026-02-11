import { FormatoSabana } from '@prisma/client';
import prisma from '../config/db';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../errors';
import { InscripcionInput } from '../utils/zod.schemas';

export const inscribirEstudiante = async (input: InscripcionInput, institucionId: string) => {
  // Verificar que la clase existe y pertenece a la institución
  const clase = await prisma.clase.findFirst({
    where: { id: input.claseId, institucionId },
    select: {
      id: true,
      cicloLectivoId: true,
      cicloLectivo: { select: { activo: true } },
    },
  });

  if (!clase) {
    throw new NotFoundError('Clase no encontrada o no pertenece a la institución');
  }

  // Verificar que el ciclo lectivo está activo
  if (!clase.cicloLectivo.activo) {
    throw new ValidationError('No se puede inscribir: el ciclo lectivo no está activo');
  }

  // Verificar que el estudiante existe y pertenece a la institución
  const estudiante = await prisma.user.findFirst({
    where: { id: input.estudianteId, institucionId, role: 'ESTUDIANTE' },
    select: { id: true },
  });

  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado o no pertenece a la institución');
  }

  // Verificar si ya está inscrito
  const existente = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_claseId: {
        estudianteId: input.estudianteId,
        claseId: input.claseId,
      },
    },
  });

  if (existente) {
    throw new ConflictError('El estudiante ya está inscrito en esta clase');
  }

  // Crear la inscripción
  const inscripcion = await prisma.inscripcion.create({
    data: {
      estudianteId: input.estudianteId,
      claseId: input.claseId,
    },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
      clase: {
        include: {
          materia: true,
          nivel: true,
          docente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  });

  // Crear registro de calificación vacío para el estudiante en esta clase
  await prisma.calificacion.create({
    data: {
      estudianteId: input.estudianteId,
      claseId: input.claseId,
      cicloLectivoId: clase.cicloLectivoId,
    },
  });

  return inscripcion;
};

export const inscribirPorCodigo = async (codigoClase: string, estudianteId: string) => {
  // Buscar clase por código
  const clase = await prisma.clase.findFirst({
    where: { codigo: codigoClase },
    select: {
      id: true,
      institucionId: true,
      cicloLectivoId: true,
      cicloLectivo: { select: { activo: true } },
    },
  });

  if (!clase) {
    throw new NotFoundError('Código de clase no válido');
  }

  if (!clase.cicloLectivo.activo) {
    throw new ValidationError('No se puede inscribir: el ciclo lectivo no está activo');
  }

  // Verificar que el estudiante pertenece a la misma institución
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId: clase.institucionId, role: 'ESTUDIANTE' },
    select: { id: true },
  });

  if (!estudiante) {
    throw new ForbiddenError('No tienes permiso para inscribirte en esta clase');
  }

  // Verificar si ya está inscrito
  const existente = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_claseId: {
        estudianteId,
        claseId: clase.id,
      },
    },
  });

  if (existente) {
    throw new ConflictError('Ya estás inscrito en esta clase');
  }

  // Crear inscripción
  const inscripcion = await prisma.inscripcion.create({
    data: {
      estudianteId,
      claseId: clase.id,
    },
    include: {
      clase: {
        include: {
          materia: true,
          nivel: true,
          docente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
  });

  // Crear registro de calificación vacío
  await prisma.calificacion.create({
    data: {
      estudianteId,
      claseId: clase.id,
      cicloLectivoId: clase.cicloLectivoId,
    },
  });

  return inscripcion;
};

export const findInscripcionesByClase = async (claseId: string, institucionId: string) => {
  return prisma.inscripcion.findMany({
    where: {
      claseId,
      clase: { institucionId },
    },
    include: {
      estudiante: {
        select: { id: true, nombre: true, apellido: true, email: true, fotoUrl: true },
      },
    },
    orderBy: { estudiante: { apellido: 'asc' } },
  });
};

export const findInscripcionesByEstudiante = async (
  estudianteId: string,
  institucionId: string,
) => {
  return prisma.inscripcion.findMany({
    where: {
      estudianteId,
      clase: { institucionId },
    },
    include: {
      clase: {
        include: {
          materia: true,
          nivel: true,
          docente: { select: { id: true, nombre: true, apellido: true } },
          cicloLectivo: true,
        },
      },
    },
  });
};

export const eliminarInscripcion = async (id: string, institucionId: string) => {
  const inscripcion = await prisma.inscripcion.findFirst({
    where: { id, clase: { institucionId } },
    select: { id: true, estudianteId: true, claseId: true },
  });

  if (!inscripcion) {
    throw new NotFoundError('Inscripción no encontrada');
  }

  // Eliminar calificaciones asociadas
  await prisma.calificacion.deleteMany({
    where: {
      estudianteId: inscripcion.estudianteId,
      claseId: inscripcion.claseId,
    },
  });

  // Eliminar asistencias asociadas
  await prisma.asistencia.deleteMany({
    where: {
      estudianteId: inscripcion.estudianteId,
      claseId: inscripcion.claseId,
    },
  });

  return prisma.inscripcion.delete({
    where: { id },
  });
};

// Inscripción masiva de estudiantes
export const inscribirMasivo = async (
  claseId: string,
  estudianteIds: string[],
  institucionId: string,
) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    select: {
      id: true,
      cicloLectivoId: true,
      cicloLectivo: { select: { activo: true } },
    },
  });

  if (!clase) {
    throw new NotFoundError('Clase no encontrada');
  }

  if (!clase.cicloLectivo.activo) {
    throw new ValidationError('Ciclo lectivo no activo');
  }

  const resultados = {
    exitosos: [] as string[],
    fallidos: [] as { estudianteId: string; error: string }[],
  };

  for (const estudianteId of estudianteIds) {
    try {
      // Verificar estudiante
      const estudiante = await prisma.user.findFirst({
        where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
        select: { id: true },
      });

      if (!estudiante) {
        resultados.fallidos.push({ estudianteId, error: 'Estudiante no encontrado' });
        continue;
      }

      // Verificar si ya existe
      const existe = await prisma.inscripcion.findUnique({
        where: {
          estudianteId_claseId: { estudianteId, claseId },
        },
      });

      if (existe) {
        resultados.fallidos.push({ estudianteId, error: 'Ya inscrito' });
        continue;
      }

      // Crear inscripción
      await prisma.inscripcion.create({
        data: { estudianteId, claseId },
      });

      // Crear calificación vacía
      await prisma.calificacion.create({
        data: {
          estudianteId,
          claseId,
          cicloLectivoId: clase.cicloLectivoId,
        },
      });

      resultados.exitosos.push(estudianteId);
    } catch (error: any) {
      resultados.fallidos.push({ estudianteId, error: error.message });
    }
  }

  return resultados;
};

// ============ Inscripción por Nivel (todas las clases) ============

export const COMPETENCIAS_POR_FORMATO: Record<FormatoSabana, string[]> = {
  INICIAL_DO: ['IL1', 'IL2', 'IL3', 'IL4', 'IL5'],
  INICIAL_HT: ['IL1', 'IL2', 'IL3', 'IL4', 'IL5'],
  PRIMARIA_DO: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  PRIMARIA_HT: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  SECUNDARIA_DO: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  SECUNDARIA_HT: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  POLITECNICO_DO: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  ADULTOS: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
};

const RA_CODIGOS_POLITECNICO = [
  'RA1', 'RA2', 'RA3', 'RA4', 'RA5',
  'RA6', 'RA7', 'RA8', 'RA9', 'RA10',
];

interface InscripcionNivelResult {
  estudianteId: string;
  nivelId: string;
  clasesInscritas: number;
  calificacionesCreadas: number;
  competenciasCreadas: number;
  tecnicasCreadas: number;
}

export const inscribirEstudianteEnNivel = async (
  estudianteId: string,
  nivelId: string,
  institucionId: string,
): Promise<InscripcionNivelResult> => {
  return prisma.$transaction(async (tx) => {
    // 1. Buscar nivel con formatoSabana
    const nivel = await tx.nivel.findUnique({
      where: { id: nivelId },
    });

    if (!nivel || nivel.institucionId !== institucionId) {
      throw new NotFoundError('Nivel no encontrado');
    }

    // 2. Verificar estudiante
    const estudiante = await tx.user.findFirst({
      where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
      select: { id: true },
    });

    if (!estudiante) {
      throw new NotFoundError('Estudiante no encontrado');
    }

    // 3. Buscar ciclo lectivo activo
    const cicloActivo = await tx.cicloLectivo.findFirst({
      where: { institucionId, activo: true },
      select: { id: true },
    });

    if (!cicloActivo) {
      throw new ValidationError('No hay un ciclo lectivo activo');
    }

    // 4. Buscar clases del nivel en el ciclo activo
    const clases = await tx.clase.findMany({
      where: { nivelId, cicloLectivoId: cicloActivo.id },
      include: { materia: { select: { tipo: true } } },
    });

    if (clases.length === 0) {
      throw new ValidationError(
        'No hay clases asignadas a este nivel en el ciclo activo',
      );
    }

    // 5. Verificar duplicados
    const inscripcionesExistentes = await tx.inscripcion.findMany({
      where: {
        estudianteId,
        claseId: { in: clases.map((c) => c.id) },
      },
      select: { claseId: true },
    });

    if (inscripcionesExistentes.length > 0) {
      throw new ConflictError(
        `El estudiante ya está inscrito en ${inscripcionesExistentes.length} clase(s) de este nivel`,
      );
    }

    // 6. Configuración según formatoSabana (usa el enum, no strings)
    const { formatoSabana } = nivel;
    const competencias = COMPETENCIAS_POR_FORMATO[formatoSabana];
    const crearTecnicas = formatoSabana === FormatoSabana.POLITECNICO_DO;

    let calificacionesCreadas = 0;
    let competenciasCreadas = 0;
    let tecnicasCreadas = 0;

    // 7. Crear inscripciones y calificaciones por clase
    for (const clase of clases) {
      // Inscripción
      await tx.inscripcion.create({
        data: { estudianteId, claseId: clase.id },
      });

      // Calificación general (todos los formatos)
      await tx.calificacion.create({
        data: {
          estudianteId,
          claseId: clase.id,
          cicloLectivoId: cicloActivo.id,
        },
      });
      calificacionesCreadas++;

      // Competencias / Indicadores de logro
      if (competencias.length > 0) {
        await tx.calificacionCompetencia.createMany({
          data: competencias.map((comp) => ({
            estudianteId,
            claseId: clase.id,
            cicloLectivoId: cicloActivo.id,
            competencia: comp,
          })),
        });
        competenciasCreadas += competencias.length;
      }

      // Calificaciones técnicas (solo POLITECNICO_DO + materia TECNICA)
      if (crearTecnicas && clase.materia.tipo === 'TECNICA') {
        await tx.calificacionTecnica.createMany({
          data: RA_CODIGOS_POLITECNICO.map((ra) => ({
            estudianteId,
            claseId: clase.id,
            ra_codigo: ra,
          })),
        });
        tecnicasCreadas += RA_CODIGOS_POLITECNICO.length;
      }
    }

    // 8. Actualizar nivelActualId del estudiante
    await tx.user.update({
      where: { id: estudianteId },
      data: { nivelActualId: nivelId },
    });

    return {
      estudianteId,
      nivelId,
      clasesInscritas: clases.length,
      calificacionesCreadas,
      competenciasCreadas,
      tecnicasCreadas,
    };
  });
};
