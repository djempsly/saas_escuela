import prisma from '../config/db';
import { Role } from '@prisma/client';

export const getDashboardStats = async (institucionId: string) => {
  // Obtener ciclo lectivo activo
  const cicloActivo = await prisma.cicloLectivo.findFirst({
    where: { institucionId, activo: true },
  });

  // Contar estudiantes
  const totalEstudiantes = await prisma.user.count({
    where: { institucionId, role: Role.ESTUDIANTE, activo: true },
  });

  // Contar docentes
  const totalDocentes = await prisma.user.count({
    where: { institucionId, role: Role.DOCENTE, activo: true },
  });

  // Contar personal (coordinadores, secretarias)
  const totalPersonal = await prisma.user.count({
    where: {
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO, Role.SECRETARIA] },
      activo: true,
    },
  });

  // Contar clases activas (del ciclo activo)
  const totalClases = cicloActivo
    ? await prisma.clase.count({
        where: { institucionId, cicloLectivoId: cicloActivo.id },
      })
    : 0;

  // Contar niveles
  const totalNiveles = await prisma.nivel.count({
    where: { institucionId },
  });

  // Contar materias
  const totalMaterias = await prisma.materia.count({
    where: { institucionId },
  });

  // Inscripciones totales (del ciclo activo)
  const totalInscripciones = cicloActivo
    ? await prisma.inscripcion.count({
        where: { clase: { institucionId, cicloLectivoId: cicloActivo.id } },
      })
    : 0;

  // Calcular promedio de asistencia (ultimos 30 dias)
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);

  const asistencias = await prisma.asistencia.findMany({
    where: {
      clase: { institucionId },
      fecha: { gte: hace30Dias },
    },
    select: { estado: true },
  });

  let promedioAsistencia = 0;
  if (asistencias.length > 0) {
    const presentes = asistencias.filter(
      (a) => a.estado === 'PRESENTE' || a.estado === 'TARDE' || a.estado === 'JUSTIFICADO'
    ).length;
    promedioAsistencia = Math.round((presentes / asistencias.length) * 100 * 10) / 10;
  }

  // Obtener proximos eventos
  const hoy = new Date();
  const proximosEventos = await prisma.evento.findMany({
    where: {
      institucionId,
      fechaInicio: { gte: hoy },
    },
    orderBy: { fechaInicio: 'asc' },
    take: 5,
    select: {
      id: true,
      titulo: true,
      fechaInicio: true,
      tipo: true,
    },
  });

  return {
    cicloActivo: cicloActivo ? { id: cicloActivo.id, nombre: cicloActivo.nombre } : null,
    estadisticas: {
      totalEstudiantes,
      totalDocentes,
      totalPersonal,
      totalClases,
      totalNiveles,
      totalMaterias,
      totalInscripciones,
      promedioAsistencia,
    },
    proximosEventos,
  };
};

export const getDashboardStatsDocente = async (docenteId: string, institucionId: string) => {
  // Obtener ciclo activo
  const cicloActivo = await prisma.cicloLectivo.findFirst({
    where: { institucionId, activo: true },
  });

  // Clases del docente
  const clases = cicloActivo
    ? await prisma.clase.findMany({
        where: { docenteId, institucionId, cicloLectivoId: cicloActivo.id },
        include: {
          materia: true,
          nivel: true,
          _count: { select: { inscripciones: true } },
        },
      })
    : [];

  const totalClases = clases.length;
  const totalEstudiantes = clases.reduce((sum, c) => sum + (c._count?.inscripciones || 0), 0);

  // Tareas pendientes de calificar
  const tareasPendientes = await prisma.entregaTarea.count({
    where: {
      tarea: { clase: { docenteId, institucionId } },
      estado: 'ENTREGADO',
    },
  });

  return {
    cicloActivo: cicloActivo ? { id: cicloActivo.id, nombre: cicloActivo.nombre } : null,
    estadisticas: {
      totalClases,
      totalEstudiantes,
      tareasPendientes,
    },
    clases: clases.map((c) => ({
      id: c.id,
      materia: c.materia.nombre,
      nivel: c.nivel.nombre,
      estudiantes: c._count?.inscripciones || 0,
    })),
  };
};

export const getDashboardStatsEstudiante = async (estudianteId: string, institucionId: string) => {
  // Clases inscritas
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
          docente: { select: { nombre: true, apellido: true } },
        },
      },
    },
  });

  const totalClases = inscripciones.length;

  // Tareas pendientes
  const tareasPendientes = await prisma.entregaTarea.count({
    where: {
      estudianteId,
      estado: 'PENDIENTE',
      tarea: { estado: 'PUBLICADA' },
    },
  });

  // Promedio de calificaciones
  const calificaciones = await prisma.calificacion.findMany({
    where: {
      estudianteId,
      clase: { institucionId },
      promedioFinal: { not: null },
    },
    select: { promedioFinal: true },
  });

  let promedioGeneral = 0;
  if (calificaciones.length > 0) {
    const suma = calificaciones.reduce((s, c) => s + (c.promedioFinal || 0), 0);
    promedioGeneral = Math.round((suma / calificaciones.length) * 10) / 10;
  }

  return {
    estadisticas: {
      totalClases,
      tareasPendientes,
      promedioGeneral,
    },
    clases: inscripciones.map((i) => ({
      id: i.clase.id,
      materia: i.clase.materia.nombre,
      nivel: i.clase.nivel.nombre,
      docente: `${i.clase.docente.nombre} ${i.clase.docente.apellido}`,
    })),
  };
};
