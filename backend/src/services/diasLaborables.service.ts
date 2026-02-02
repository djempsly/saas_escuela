import prisma from '../config/db';

export interface DiasLaborablesInput {
  agosto?: number;
  septiembre?: number;
  octubre?: number;
  noviembre?: number;
  diciembre?: number;
  enero?: number;
  febrero?: number;
  marzo?: number;
  abril?: number;
  mayo?: number;
  junio?: number;
}

export const getDiasLaborables = async (claseId: string, cicloLectivoId: string) => {
  return prisma.diasLaborables.findUnique({
    where: {
      claseId_cicloLectivoId: {
        claseId,
        cicloLectivoId,
      },
    },
  });
};

export const upsertDiasLaborables = async (
  claseId: string,
  cicloLectivoId: string,
  data: DiasLaborablesInput
) => {
  return prisma.diasLaborables.upsert({
    where: {
      claseId_cicloLectivoId: {
        claseId,
        cicloLectivoId,
      },
    },
    update: {
      agosto: data.agosto ?? 0,
      septiembre: data.septiembre ?? 0,
      octubre: data.octubre ?? 0,
      noviembre: data.noviembre ?? 0,
      diciembre: data.diciembre ?? 0,
      enero: data.enero ?? 0,
      febrero: data.febrero ?? 0,
      marzo: data.marzo ?? 0,
      abril: data.abril ?? 0,
      mayo: data.mayo ?? 0,
      junio: data.junio ?? 0,
    },
    create: {
      claseId,
      cicloLectivoId,
      agosto: data.agosto ?? 0,
      septiembre: data.septiembre ?? 0,
      octubre: data.octubre ?? 0,
      noviembre: data.noviembre ?? 0,
      diciembre: data.diciembre ?? 0,
      enero: data.enero ?? 0,
      febrero: data.febrero ?? 0,
      marzo: data.marzo ?? 0,
      abril: data.abril ?? 0,
      mayo: data.mayo ?? 0,
      junio: data.junio ?? 0,
    },
  });
};

// Obtener el total de días laborables configurados
export const getTotalDiasLaborables = async (claseId: string, cicloLectivoId: string) => {
  const dias = await getDiasLaborables(claseId, cicloLectivoId);
  if (!dias) return 0;

  return (
    (dias.agosto || 0) +
    (dias.septiembre || 0) +
    (dias.octubre || 0) +
    (dias.noviembre || 0) +
    (dias.diciembre || 0) +
    (dias.enero || 0) +
    (dias.febrero || 0) +
    (dias.marzo || 0) +
    (dias.abril || 0) +
    (dias.mayo || 0) +
    (dias.junio || 0)
  );
};

// Obtener estadísticas de asistencia con porcentaje
export const getAsistenciaStats = async (
  claseId: string,
  cicloLectivoId: string,
  estudianteId?: string
) => {
  // Obtener días laborables configurados
  const diasLaborables = await getDiasLaborables(claseId, cicloLectivoId);
  const totalDiasLaborables = diasLaborables
    ? (diasLaborables.agosto || 0) +
      (diasLaborables.septiembre || 0) +
      (diasLaborables.octubre || 0) +
      (diasLaborables.noviembre || 0) +
      (diasLaborables.diciembre || 0) +
      (diasLaborables.enero || 0) +
      (diasLaborables.febrero || 0) +
      (diasLaborables.marzo || 0) +
      (diasLaborables.abril || 0) +
      (diasLaborables.mayo || 0) +
      (diasLaborables.junio || 0)
    : 0;

  // Obtener asistencias
  const whereClause: any = { claseId };
  if (estudianteId) {
    whereClause.estudianteId = estudianteId;
  }

  const asistencias = await prisma.asistencia.groupBy({
    by: ['estudianteId', 'estado'],
    where: whereClause,
    _count: {
      estado: true,
    },
  });

  // Agrupar por estudiante
  const statsByStudent: Map<
    string,
    { presentes: number; ausentes: number; tardes: number; justificados: number }
  > = new Map();

  asistencias.forEach((a) => {
    if (!statsByStudent.has(a.estudianteId)) {
      statsByStudent.set(a.estudianteId, {
        presentes: 0,
        ausentes: 0,
        tardes: 0,
        justificados: 0,
      });
    }
    const stats = statsByStudent.get(a.estudianteId)!;
    switch (a.estado) {
      case 'PRESENTE':
        stats.presentes = a._count.estado;
        break;
      case 'AUSENTE':
        stats.ausentes = a._count.estado;
        break;
      case 'TARDE':
        stats.tardes = a._count.estado;
        break;
      case 'JUSTIFICADO':
        stats.justificados = a._count.estado;
        break;
    }
  });

  // Calcular porcentajes
  const result: {
    estudianteId: string;
    presentes: number;
    ausentes: number;
    tardes: number;
    justificados: number;
    totalAsistencias: number;
    porcentajeAsistencia: number;
  }[] = [];

  statsByStudent.forEach((stats, estudianteId) => {
    const totalAsistencias = stats.presentes + stats.tardes; // Presente y tarde cuentan como asistencia
    const porcentaje =
      totalDiasLaborables > 0
        ? Math.round((totalAsistencias / totalDiasLaborables) * 100 * 10) / 10
        : 0;

    result.push({
      estudianteId,
      ...stats,
      totalAsistencias,
      porcentajeAsistencia: porcentaje,
    });
  });

  return {
    diasLaborables,
    totalDiasLaborables,
    estadisticas: result,
  };
};
