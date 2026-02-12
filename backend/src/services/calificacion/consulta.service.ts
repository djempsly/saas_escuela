import prisma from '../../config/db';
import { NotFoundError } from '../../errors';

// Obtener calificaciones de un estudiante
export const getCalificacionesByEstudiante = async (
  estudianteId: string,
  institucionId: string,
  cicloLectivoId?: string,
) => {
  // Verificar estudiante
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId },
    select: { id: true, nombre: true, apellido: true },
  });

  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado');
  }

  const whereClause: any = {
    estudianteId,
    clase: { institucionId },
    publicado: true,
  };

  if (cicloLectivoId) {
    whereClause.cicloLectivoId = cicloLectivoId;
  }

  const calificaciones = await prisma.calificacion.findMany({
    where: whereClause,
    include: {
      clase: {
        select: {
          id: true,
          codigo: true,
          materia: { select: { id: true, nombre: true, tipo: true, codigo: true } },
          nivel: { select: { id: true, nombre: true } },
          docente: { select: { nombre: true, apellido: true } },
        },
      },
      cicloLectivo: { select: { id: true, nombre: true, activo: true } },
    },
    orderBy: { clase: { materia: { nombre: 'asc' } } },
  });

  // Calificaciones técnicas
  const calificacionesTecnicas = await prisma.calificacionTecnica.findMany({
    where: {
      estudianteId,
      clase: { institucionId },
    },
    include: {
      clase: { select: { id: true, materia: { select: { id: true, nombre: true, tipo: true } } } },
    },
  });

  // Calificaciones por competencia (publicadas)
  const whereComp: any = {
    estudianteId,
    clase: { institucionId },
    publicado: true,
  };
  if (cicloLectivoId) {
    whereComp.cicloLectivoId = cicloLectivoId;
  }

  const calificacionesCompetencia = await prisma.calificacionCompetencia.findMany({
    where: whereComp,
    include: {
      clase: { select: { id: true, materia: { select: { id: true, nombre: true, tipo: true } } } },
    },
  });

  return {
    estudiante,
    calificaciones,
    calificacionesTecnicas: calificacionesTecnicas.length > 0 ? calificacionesTecnicas : undefined,
    calificacionesCompetencia:
      calificacionesCompetencia.length > 0 ? calificacionesCompetencia : undefined,
  };
};

// Boletín de calificaciones
export const getBoletinEstudiante = async (
  estudianteId: string,
  cicloLectivoId: string,
  institucionId: string,
) => {
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId },
    select: { id: true, nombre: true, apellido: true, fotoUrl: true },
  });

  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado');
  }

  const ciclo = await prisma.cicloLectivo.findFirst({
    where: { id: cicloLectivoId, institucionId },
    select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, activo: true },
  });

  if (!ciclo) {
    throw new NotFoundError('Ciclo lectivo no encontrado');
  }

  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
    select: { nombre: true, sistema: true, logoUrl: true },
  });

  const calificaciones = await prisma.calificacion.findMany({
    where: {
      estudianteId,
      cicloLectivoId,
      clase: { institucionId },
      publicado: true,
    },
    include: {
      clase: {
        select: {
          id: true,
          materia: { select: { id: true, nombre: true, tipo: true } },
          nivel: { select: { id: true, nombre: true } },
          docente: { select: { nombre: true, apellido: true } },
        },
      },
    },
    orderBy: { clase: { materia: { nombre: 'asc' } } },
  });

  // Calcular promedio general
  const promedios = calificaciones.map((c) => c.promedioFinal || 0).filter((p) => p > 0);
  const promedioGeneral =
    promedios.length > 0 ? promedios.reduce((a, b) => a + b, 0) / promedios.length : 0;

  // Competencias publicadas para este ciclo
  const competencias = await prisma.calificacionCompetencia.findMany({
    where: {
      estudianteId,
      cicloLectivoId,
      clase: { institucionId },
      publicado: true,
    },
    select: {
      id: true,
      competencia: true,
      claseId: true,
      p1: true,
      p2: true,
      p3: true,
      p4: true,
      rp1: true,
      rp2: true,
      rp3: true,
      rp4: true,
    },
  });

  // Agrupar competencias por claseId
  const competenciasPorClase: Record<
    string,
    Array<{
      competencia: string;
      p1: number | null;
      p2: number | null;
      p3: number | null;
      p4: number | null;
      rp1: number | null;
      rp2: number | null;
      rp3: number | null;
      rp4: number | null;
    }>
  > = {};

  for (const comp of competencias) {
    if (!competenciasPorClase[comp.claseId]) {
      competenciasPorClase[comp.claseId] = [];
    }
    competenciasPorClase[comp.claseId].push({
      competencia: comp.competencia,
      p1: comp.p1,
      p2: comp.p2,
      p3: comp.p3,
      p4: comp.p4,
      rp1: comp.rp1,
      rp2: comp.rp2,
      rp3: comp.rp3,
      rp4: comp.rp4,
    });
  }

  return {
    institucion,
    estudiante,
    cicloLectivo: ciclo,
    calificaciones: calificaciones.map((c) => ({
      materia: c.clase.materia.nombre,
      nivel: c.clase.nivel.nombre,
      docente: `${c.clase.docente.nombre} ${c.clase.docente.apellido}`,
      p1: c.p1,
      p2: c.p2,
      p3: c.p3,
      p4: c.p4,
      cpc: c.cpc_total,
      cpex: c.cpex_total,
      promedioFinal: c.promedioFinal,
      situacion: c.situacion,
      competencias: competenciasPorClase[c.claseId] || [],
    })),
    promedioGeneral: Math.round(promedioGeneral * 100) / 100,
  };
};
