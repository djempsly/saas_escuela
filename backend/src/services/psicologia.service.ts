import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getEstudiantesNotasBajas(institucionId: string, cicloLectivoId: string) {
  const calificaciones = await prisma.calificacion.findMany({
    where: {
      cicloLectivoId,
      clase: { institucionId },
      OR: [
        { promedioFinal: { lt: 70 } },
        { situacion: 'REPROBADO' },
      ],
    },
    include: {
      estudiante: {
        select: {
          id: true,
          nombre: true,
          segundoNombre: true,
          apellido: true,
          segundoApellido: true,
          nivelActual: { select: { id: true, nombre: true } },
        },
      },
      clase: {
        select: {
          id: true,
          materia: { select: { id: true, nombre: true } },
          nivel: { select: { id: true, nombre: true } },
        },
      },
    },
  });

  // Group by student
  const estudiantesMap = new Map<string, {
    estudiante: typeof calificaciones[0]['estudiante'];
    materiasReprobadas: {
      materiaId: string;
      materiaNombre: string;
      claseId: string;
      promedioFinal: number | null;
      situacion: string | null;
    }[];
    promedioGeneral: number;
  }>();

  for (const cal of calificaciones) {
    const estId = cal.estudianteId;
    if (!estudiantesMap.has(estId)) {
      estudiantesMap.set(estId, {
        estudiante: cal.estudiante,
        materiasReprobadas: [],
        promedioGeneral: 0,
      });
    }
    const entry = estudiantesMap.get(estId)!;
    entry.materiasReprobadas.push({
      materiaId: cal.clase.materia.id,
      materiaNombre: cal.clase.materia.nombre,
      claseId: cal.clase.id,
      promedioFinal: cal.promedioFinal,
      situacion: cal.situacion,
    });
  }

  // Calculate average and sort worst first
  const result = Array.from(estudiantesMap.values()).map((entry) => {
    const promedios = entry.materiasReprobadas
      .map((m) => m.promedioFinal ?? 0);
    const promedioGeneral = promedios.length > 0
      ? promedios.reduce((a, b) => a + b, 0) / promedios.length
      : 0;
    return { ...entry, promedioGeneral: Math.round(promedioGeneral * 100) / 100 };
  });

  result.sort((a, b) => a.promedioGeneral - b.promedioGeneral);

  return result;
}

export async function crearObservacion(estudianteId: string, psicologoId: string, texto: string) {
  return prisma.observacionPsicologica.create({
    data: { estudianteId, psicologoId, texto },
    include: {
      psicologo: {
        select: { id: true, nombre: true, apellido: true },
      },
    },
  });
}

export async function getObservaciones(estudianteId: string) {
  return prisma.observacionPsicologica.findMany({
    where: { estudianteId },
    include: {
      psicologo: {
        select: { id: true, nombre: true, apellido: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function eliminarObservacion(id: string, psicologoId: string) {
  const observacion = await prisma.observacionPsicologica.findUnique({
    where: { id },
  });

  if (!observacion) {
    throw new Error('Observación no encontrada');
  }

  if (observacion.psicologoId !== psicologoId) {
    throw new Error('No autorizado para eliminar esta observación');
  }

  return prisma.observacionPsicologica.delete({ where: { id } });
}
