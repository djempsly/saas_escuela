import prisma from '../config/db';
import { EstadoAsistencia } from '@prisma/client';

interface AsistenciaItem {
  estudianteId: string;
  estado: EstadoAsistencia;
}

interface TomarAsistenciaInput {
  claseId: string;
  fecha: Date;
  asistencias: AsistenciaItem[];
}

export const tomarAsistencia = async (input: TomarAsistenciaInput, institucionId: string) => {
  // Verificar que la clase existe y pertenece a la institución
  const clase = await prisma.clase.findFirst({
    where: { id: input.claseId, institucionId },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  // Validar que la fecha no sea fin de semana
  const fechaValidar = new Date(input.fecha);
  const diaSemana = fechaValidar.getUTCDay();
  if (diaSemana === 0) {
    throw new Error('No se puede registrar asistencia en día domingo');
  }
  if (diaSemana === 6) {
    throw new Error('No se puede registrar asistencia en día sábado');
  }

  // Validar que la fecha no sea feriado
  const fechaInicioDay = new Date(fechaValidar);
  fechaInicioDay.setUTCHours(0, 0, 0, 0);
  const fechaFinDay = new Date(fechaValidar);
  fechaFinDay.setUTCHours(23, 59, 59, 999);

  const feriado = await prisma.evento.findFirst({
    where: {
      institucionId,
      tipo: 'FERIADO',
      fechaInicio: { lte: fechaFinDay },
      fechaFin: { gte: fechaInicioDay },
    },
    select: { titulo: true },
  });

  if (feriado) {
    throw new Error(`No se puede registrar asistencia en día feriado: ${feriado.titulo}`);
  }

  // Verificar que todos los estudiantes están inscritos en la clase
  const estudianteIds = input.asistencias.map((a) => a.estudianteId);
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      claseId: input.claseId,
      estudianteId: { in: estudianteIds },
    },
  });

  const inscritosIds = new Set(inscripciones.map((i) => i.estudianteId));
  const noInscritos = estudianteIds.filter((id) => !inscritosIds.has(id));

  if (noInscritos.length > 0) {
    throw new Error(`Estudiantes no inscritos en la clase: ${noInscritos.join(', ')}`);
  }

  // Normalizar la fecha (solo fecha, sin hora)
  const fechaNormalizada = new Date(input.fecha);
  fechaNormalizada.setHours(0, 0, 0, 0);

  // Usar upsert para cada asistencia (crear o actualizar)
  const resultados = await Promise.all(
    input.asistencias.map(async (item) => {
      // Buscar si ya existe registro para esa fecha
      const existente = await prisma.asistencia.findFirst({
        where: {
          claseId: input.claseId,
          estudianteId: item.estudianteId,
          fecha: {
            gte: fechaNormalizada,
            lt: new Date(fechaNormalizada.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existente) {
        // Actualizar
        return prisma.asistencia.update({
          where: { id: existente.id },
          data: { estado: item.estado },
        });
      } else {
        // Crear
        return prisma.asistencia.create({
          data: {
            claseId: input.claseId,
            estudianteId: item.estudianteId,
            fecha: fechaNormalizada,
            estado: item.estado,
          },
        });
      }
    }),
  );

  return {
    fecha: fechaNormalizada,
    claseId: input.claseId,
    registros: resultados.length,
  };
};

export const getAsistenciaByClaseYFecha = async (
  claseId: string,
  fecha: Date,
  institucionId: string,
) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    include: { materia: true, nivel: true },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  const fechaNormalizada = new Date(fecha);
  fechaNormalizada.setHours(0, 0, 0, 0);

  // Obtener TODOS los estudiantes inscritos
  const inscripciones = await prisma.inscripcion.findMany({
    where: { claseId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
    },
    orderBy: { estudiante: { apellido: 'asc' } },
  });

  // Obtener asistencias registradas para esa fecha
  const asistenciasExistentes = await prisma.asistencia.findMany({
    where: {
      claseId,
      fecha: {
        gte: fechaNormalizada,
        lt: new Date(fechaNormalizada.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  // Crear mapa de asistencias por estudianteId
  const asistenciasMap = new Map(asistenciasExistentes.map((a) => [a.estudianteId, a]));

  // Combinar: todos los estudiantes con su asistencia (o null si no hay registro)
  const asistencias = inscripciones.map((insc) => {
    const asist = asistenciasMap.get(insc.estudianteId);
    return {
      id: asist?.id || null,
      estudianteId: insc.estudianteId,
      claseId,
      fecha: fechaNormalizada,
      estudiante: insc.estudiante,
      estado: asist?.estado || null,
    };
  });

  return {
    clase: {
      id: clase.id,
      materia: clase.materia.nombre,
      nivel: clase.nivel.nombre,
    },
    fecha: fechaNormalizada,
    totalEstudiantes: inscripciones.length,
    asistencias,
  };
};

export const getReporteAsistenciaByClase = async (
  claseId: string,
  fechaInicio: Date,
  fechaFin: Date,
  institucionId: string,
) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    include: {
      materia: true,
      nivel: true,
      docente: { select: { nombre: true, apellido: true } },
    },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  // Obtener estudiantes inscritos
  const inscripciones = await prisma.inscripcion.findMany({
    where: { claseId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true } },
    },
  });

  // Obtener todas las asistencias del rango
  const asistencias = await prisma.asistencia.findMany({
    where: {
      claseId,
      fecha: { gte: fechaInicio, lte: fechaFin },
    },
  });

  // Agrupar asistencias por estudiante
  const reporte = inscripciones.map((inscripcion) => {
    const asistenciasEstudiante = asistencias.filter(
      (a) => a.estudianteId === inscripcion.estudianteId,
    );

    const conteo = {
      presente: asistenciasEstudiante.filter((a) => a.estado === 'PRESENTE').length,
      ausente: asistenciasEstudiante.filter((a) => a.estado === 'AUSENTE').length,
      tarde: asistenciasEstudiante.filter((a) => a.estado === 'TARDE').length,
      justificado: asistenciasEstudiante.filter((a) => a.estado === 'JUSTIFICADO').length,
      total: asistenciasEstudiante.length,
    };

    const porcentajeAsistencia =
      conteo.total > 0
        ? (((conteo.presente + conteo.tarde + conteo.justificado) / conteo.total) * 100).toFixed(1)
        : '0';

    return {
      estudiante: inscripcion.estudiante,
      conteo,
      porcentajeAsistencia: parseFloat(porcentajeAsistencia),
    };
  });

  return {
    clase: {
      id: clase.id,
      materia: clase.materia.nombre,
      nivel: clase.nivel.nombre,
      docente: `${clase.docente.nombre} ${clase.docente.apellido}`,
    },
    periodo: { fechaInicio, fechaFin },
    totalEstudiantes: inscripciones.length,
    reporte,
  };
};

export const getReporteAsistenciaByEstudiante = async (
  estudianteId: string,
  fechaInicio: Date,
  fechaFin: Date,
  institucionId: string,
) => {
  // Verificar que el estudiante pertenece a la institución
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
    select: { id: true, nombre: true, apellido: true },
  });

  if (!estudiante) {
    throw new Error('Estudiante no encontrado');
  }

  // Obtener inscripciones del estudiante
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      estudianteId,
      clase: { institucionId },
    },
    include: {
      clase: {
        include: {
          materia: true,
          nivel: true,
        },
      },
    },
  });

  // Obtener todas las asistencias del estudiante en el rango
  const asistencias = await prisma.asistencia.findMany({
    where: {
      estudianteId,
      fecha: { gte: fechaInicio, lte: fechaFin },
      clase: { institucionId },
    },
    include: {
      clase: {
        include: { materia: true },
      },
    },
  });

  // Agrupar por clase
  const reportePorClase = inscripciones.map((inscripcion) => {
    const asistenciasClase = asistencias.filter((a) => a.claseId === inscripcion.claseId);

    const conteo = {
      presente: asistenciasClase.filter((a) => a.estado === 'PRESENTE').length,
      ausente: asistenciasClase.filter((a) => a.estado === 'AUSENTE').length,
      tarde: asistenciasClase.filter((a) => a.estado === 'TARDE').length,
      justificado: asistenciasClase.filter((a) => a.estado === 'JUSTIFICADO').length,
      total: asistenciasClase.length,
    };

    const porcentajeAsistencia =
      conteo.total > 0
        ? (((conteo.presente + conteo.tarde + conteo.justificado) / conteo.total) * 100).toFixed(1)
        : '0';

    return {
      clase: {
        id: inscripcion.clase.id,
        materia: inscripcion.clase.materia.nombre,
        nivel: inscripcion.clase.nivel.nombre,
      },
      conteo,
      porcentajeAsistencia: parseFloat(porcentajeAsistencia),
    };
  });

  // Calcular totales globales
  const totalGlobal = {
    presente: asistencias.filter((a) => a.estado === 'PRESENTE').length,
    ausente: asistencias.filter((a) => a.estado === 'AUSENTE').length,
    tarde: asistencias.filter((a) => a.estado === 'TARDE').length,
    justificado: asistencias.filter((a) => a.estado === 'JUSTIFICADO').length,
    total: asistencias.length,
  };

  const porcentajeGlobal =
    totalGlobal.total > 0
      ? (
          ((totalGlobal.presente + totalGlobal.tarde + totalGlobal.justificado) /
            totalGlobal.total) *
          100
        ).toFixed(1)
      : '0';

  return {
    estudiante,
    periodo: { fechaInicio, fechaFin },
    porClase: reportePorClase,
    totales: {
      ...totalGlobal,
      porcentajeAsistencia: parseFloat(porcentajeGlobal),
    },
  };
};

// Obtener lista de fechas donde se tomó asistencia para una clase
export const getFechasAsistencia = async (claseId: string, institucionId: string) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  const asistencias = await prisma.asistencia.findMany({
    where: { claseId },
    select: { fecha: true },
    distinct: ['fecha'],
    orderBy: { fecha: 'desc' },
  });

  return asistencias.map((a) => a.fecha);
};
