import prisma from '../config/db';
import { InscripcionInput } from '../utils/zod.schemas';

export const inscribirEstudiante = async (input: InscripcionInput, institucionId: string) => {
  // Verificar que la clase existe y pertenece a la institución
  const clase = await prisma.clase.findFirst({
    where: { id: input.claseId, institucionId },
    include: { cicloLectivo: true },
  });

  if (!clase) {
    throw new Error('Clase no encontrada o no pertenece a la institución');
  }

  // Verificar que el ciclo lectivo está activo
  if (!clase.cicloLectivo.activo) {
    throw new Error('No se puede inscribir: el ciclo lectivo no está activo');
  }

  // Verificar que el estudiante existe y pertenece a la institución
  const estudiante = await prisma.user.findFirst({
    where: { id: input.estudianteId, institucionId, role: 'ESTUDIANTE' },
  });

  if (!estudiante) {
    throw new Error('Estudiante no encontrado o no pertenece a la institución');
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
    throw new Error('El estudiante ya está inscrito en esta clase');
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
    include: { cicloLectivo: true, institucion: true },
  });

  if (!clase) {
    throw new Error('Código de clase no válido');
  }

  if (!clase.cicloLectivo.activo) {
    throw new Error('No se puede inscribir: el ciclo lectivo no está activo');
  }

  // Verificar que el estudiante pertenece a la misma institución
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId: clase.institucionId, role: 'ESTUDIANTE' },
  });

  if (!estudiante) {
    throw new Error('No tienes permiso para inscribirte en esta clase');
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
    throw new Error('Ya estás inscrito en esta clase');
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
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true, fotoUrl: true } },
    },
    orderBy: { estudiante: { apellido: 'asc' } },
  });
};

export const findInscripcionesByEstudiante = async (estudianteId: string, institucionId: string) => {
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
    include: { clase: true },
  });

  if (!inscripcion) {
    throw new Error('Inscripción no encontrada');
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
  institucionId: string
) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    include: { cicloLectivo: true },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  if (!clase.cicloLectivo.activo) {
    throw new Error('Ciclo lectivo no activo');
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
