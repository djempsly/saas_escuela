import prisma from '../config/db';
import { SistemaEducativo, TipoMateria } from '@prisma/client';

// Interfaces para los diferentes tipos de calificaciones
interface CalificacionGeneralInput {
  estudianteId: string;
  claseId: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  rp1?: number;
  rp2?: number;
  rp3?: number;
  rp4?: number;
  cpc_30?: number;
  cpex_70?: number;
}

interface CalificacionTecnicaInput {
  estudianteId: string;
  claseId: string;
  ra_codigo: string;
  valor: number;
}

// Validar permisos sobre la clase
const validarAccesoClase = async (claseId: string, institucionId: string) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    include: {
      materia: true,
      cicloLectivo: true,
      institucion: true,
    },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  return clase;
};

// Calcular promedio final según sistema educativo
const calcularPromedioFinal = (
  sistema: SistemaEducativo,
  calificacion: CalificacionGeneralInput
): { promedioFinal: number; situacion: string } => {
  const { p1 = 0, p2 = 0, p3 = 0, p4 = 0, cpc_30 = 0, cpex_70 = 0 } = calificacion;

  // Usar recuperaciones si existen y son mayores
  const rp1 = calificacion.rp1 || 0;
  const rp2 = calificacion.rp2 || 0;
  const rp3 = calificacion.rp3 || 0;
  const rp4 = calificacion.rp4 || 0;

  const notaP1 = Math.max(p1, rp1);
  const notaP2 = Math.max(p2, rp2);
  const notaP3 = Math.max(p3, rp3);
  const notaP4 = Math.max(p4, rp4);

  let promedioFinal = 0;
  let situacion = 'PENDIENTE';

  switch (sistema) {
    case SistemaEducativo.PRIMARIA_HT:
    case SistemaEducativo.SECUNDARIA_HT:
      // Haití: Promedio simple de 4 periodos (o 3 si P4 es 0)
      const periodosHT = [notaP1, notaP2, notaP3, notaP4].filter((n) => n > 0);
      if (periodosHT.length > 0) {
        promedioFinal = periodosHT.reduce((a, b) => a + b, 0) / periodosHT.length;
      }
      // En Haití, generalmente se aprueba con 50/100 o 5/10
      situacion = promedioFinal >= 50 ? 'APROBADO' : promedioFinal > 0 ? 'REPROBADO' : 'PENDIENTE';
      break;

    case SistemaEducativo.PRIMARIA_DO:
    case SistemaEducativo.SECUNDARIA_GENERAL_DO:
      // RD General: CPC (30%) + Promedio Periodos (70%)
      const periodosDO = [notaP1, notaP2, notaP3, notaP4].filter((n) => n > 0);
      const promedioPeridos =
        periodosDO.length > 0 ? periodosDO.reduce((a, b) => a + b, 0) / periodosDO.length : 0;

      // CPC vale 30%, periodos valen 70%
      const cpc_total = cpc_30;
      const cpex_total = (promedioPeridos * 70) / 100;
      promedioFinal = cpc_total + cpex_total;

      // En RD se aprueba con 70
      if (promedioFinal >= 70) {
        situacion = 'APROBADO';
      } else if (promedioFinal >= 60) {
        situacion = 'APLAZADO';
      } else if (promedioFinal > 0) {
        situacion = 'REPROBADO';
      }
      break;

    case SistemaEducativo.POLITECNICO_DO:
      // Politécnico RD: Similar a general pero materias técnicas usan RA
      const periodosPoli = [notaP1, notaP2, notaP3, notaP4].filter((n) => n > 0);
      const promedioPoli =
        periodosPoli.length > 0 ? periodosPoli.reduce((a, b) => a + b, 0) / periodosPoli.length : 0;

      const cpcPoli = cpc_30;
      const cpexPoli = (promedioPoli * 70) / 100;
      promedioFinal = cpcPoli + cpexPoli;

      if (promedioFinal >= 70) {
        situacion = 'APROBADO';
      } else if (promedioFinal >= 60) {
        situacion = 'APLAZADO';
      } else if (promedioFinal > 0) {
        situacion = 'REPROBADO';
      }
      break;
  }

  return {
    promedioFinal: Math.round(promedioFinal * 100) / 100,
    situacion,
  };
};

// Guardar/Actualizar calificación general
export const guardarCalificacion = async (
  input: CalificacionGeneralInput,
  institucionId: string
) => {
  const clase = await validarAccesoClase(input.claseId, institucionId);

  // Verificar sistema educativo
  const sistema = clase.institucion.sistema;

  // Si es Politécnico y materia técnica, no permitir aquí
  if (sistema === SistemaEducativo.POLITECNICO_DO && clase.materia.tipo === TipoMateria.TECNICA) {
    throw new Error(
      'Para materias técnicas en Politécnico, use el endpoint de calificación técnica (RA)'
    );
  }

  // Verificar que el estudiante está inscrito
  const inscripcion = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_claseId: {
        estudianteId: input.estudianteId,
        claseId: input.claseId,
      },
    },
  });

  if (!inscripcion) {
    throw new Error('Estudiante no inscrito en esta clase');
  }

  // Preparar datos según sistema
  let dataToSave: any = {
    p1: input.p1,
    p2: input.p2,
    p3: input.p3,
    p4: input.p4,
    rp1: input.rp1,
    rp2: input.rp2,
    rp3: input.rp3,
    rp4: input.rp4,
  };

  // Solo sistemas RD usan CPC
  if (sistema !== SistemaEducativo.PRIMARIA_HT && sistema !== SistemaEducativo.SECUNDARIA_HT) {
    dataToSave.cpc_30 = input.cpc_30;
    dataToSave.cpex_70 = input.cpex_70;
    dataToSave.cpc_total = input.cpc_30;
    dataToSave.cpex_total = input.cpex_70 ? (input.cpex_70 * 70) / 100 : 0;
  }

  // Calcular promedio final
  const { promedioFinal, situacion } = calcularPromedioFinal(sistema, input);
  dataToSave.promedioFinal = promedioFinal;
  dataToSave.situacion = situacion;

  // Buscar calificación existente o crear nueva
  const existente = await prisma.calificacion.findUnique({
    where: {
      estudianteId_claseId_cicloLectivoId: {
        estudianteId: input.estudianteId,
        claseId: input.claseId,
        cicloLectivoId: clase.cicloLectivoId,
      },
    },
  });

  if (existente) {
    return prisma.calificacion.update({
      where: { id: existente.id },
      data: dataToSave,
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true } },
        clase: { include: { materia: true } },
      },
    });
  } else {
    return prisma.calificacion.create({
      data: {
        ...dataToSave,
        estudianteId: input.estudianteId,
        claseId: input.claseId,
        cicloLectivoId: clase.cicloLectivoId,
      },
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true } },
        clase: { include: { materia: true } },
      },
    });
  }
};

// Guardar calificación técnica (RA) - Solo Politécnico
export const guardarCalificacionTecnica = async (
  input: CalificacionTecnicaInput,
  institucionId: string
) => {
  const clase = await validarAccesoClase(input.claseId, institucionId);

  // Verificar que es Politécnico
  if (clase.institucion.sistema !== SistemaEducativo.POLITECNICO_DO) {
    throw new Error('Calificaciones técnicas solo aplican para Politécnicos');
  }

  // Verificar que la materia es técnica
  if (clase.materia.tipo !== TipoMateria.TECNICA) {
    throw new Error('Esta materia no es de tipo técnica. Use calificación general.');
  }

  // Verificar inscripción
  const inscripcion = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_claseId: {
        estudianteId: input.estudianteId,
        claseId: input.claseId,
      },
    },
  });

  if (!inscripcion) {
    throw new Error('Estudiante no inscrito en esta clase');
  }

  // Validar valor (0-100)
  if (input.valor < 0 || input.valor > 100) {
    throw new Error('El valor debe estar entre 0 y 100');
  }

  // Upsert del RA
  return prisma.calificacionTecnica.upsert({
    where: {
      estudianteId_claseId_ra_codigo: {
        estudianteId: input.estudianteId,
        claseId: input.claseId,
        ra_codigo: input.ra_codigo,
      },
    },
    update: { valor: input.valor },
    create: {
      estudianteId: input.estudianteId,
      claseId: input.claseId,
      ra_codigo: input.ra_codigo,
      valor: input.valor,
    },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true } },
      clase: { include: { materia: true } },
    },
  });
};

// Obtener calificaciones de una clase (incluye TODOS los estudiantes inscritos)
export const getCalificacionesByClase = async (claseId: string, institucionId: string) => {
  const clase = await validarAccesoClase(claseId, institucionId);

  // Obtener TODOS los estudiantes inscritos en la clase
  const inscripciones = await prisma.inscripcion.findMany({
    where: { claseId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
    },
    orderBy: { estudiante: { apellido: 'asc' } },
  });

  // Obtener calificaciones existentes
  const calificacionesExistentes = await prisma.calificacion.findMany({
    where: { claseId },
  });

  // Crear mapa de calificaciones por estudianteId
  const calificacionesMap = new Map(
    calificacionesExistentes.map((c) => [c.estudianteId, c])
  );

  // Combinar: todos los estudiantes inscritos con sus calificaciones (o vacías)
  const calificaciones = inscripciones.map((insc) => {
    const cal = calificacionesMap.get(insc.estudianteId);
    return {
      id: cal?.id || null,
      estudianteId: insc.estudianteId,
      claseId: claseId,
      estudiante: insc.estudiante,
      p1: cal?.p1 ?? null,
      p2: cal?.p2 ?? null,
      p3: cal?.p3 ?? null,
      p4: cal?.p4 ?? null,
      rp1: cal?.rp1 ?? null,
      rp2: cal?.rp2 ?? null,
      rp3: cal?.rp3 ?? null,
      rp4: cal?.rp4 ?? null,
      cpc_30: cal?.cpc_30 ?? null,
      cpex_70: cal?.cpex_70 ?? null,
      promedioFinal: cal?.promedioFinal ?? null,
      situacion: cal?.situacion ?? null,
    };
  });

  // Si es Politécnico y materia técnica, incluir también las calificaciones técnicas
  let calificacionesTecnicas: any[] = [];
  if (
    clase.institucion.sistema === SistemaEducativo.POLITECNICO_DO &&
    clase.materia.tipo === TipoMateria.TECNICA
  ) {
    calificacionesTecnicas = await prisma.calificacionTecnica.findMany({
      where: { claseId },
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: [{ estudiante: { apellido: 'asc' } }, { ra_codigo: 'asc' }],
    });
  }

  return {
    clase: {
      id: clase.id,
      materia: clase.materia,
      sistema: clase.institucion.sistema,
      tipoMateria: clase.materia.tipo,
    },
    calificaciones,
    totalEstudiantes: inscripciones.length,
    calificacionesTecnicas:
      calificacionesTecnicas.length > 0 ? calificacionesTecnicas : undefined,
  };
};

// Obtener calificaciones de un estudiante
export const getCalificacionesByEstudiante = async (
  estudianteId: string,
  institucionId: string,
  cicloLectivoId?: string
) => {
  // Verificar estudiante
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId },
    select: { id: true, nombre: true, apellido: true },
  });

  if (!estudiante) {
    throw new Error('Estudiante no encontrado');
  }

  const whereClause: any = {
    estudianteId,
    clase: { institucionId },
  };

  if (cicloLectivoId) {
    whereClause.cicloLectivoId = cicloLectivoId;
  }

  const calificaciones = await prisma.calificacion.findMany({
    where: whereClause,
    include: {
      clase: {
        include: {
          materia: true,
          nivel: true,
          docente: { select: { nombre: true, apellido: true } },
        },
      },
      cicloLectivo: true,
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
      clase: { include: { materia: true } },
    },
  });

  return {
    estudiante,
    calificaciones,
    calificacionesTecnicas:
      calificacionesTecnicas.length > 0 ? calificacionesTecnicas : undefined,
  };
};

// Boletín de calificaciones
export const getBoletinEstudiante = async (
  estudianteId: string,
  cicloLectivoId: string,
  institucionId: string
) => {
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId },
    select: { id: true, nombre: true, apellido: true, fotoUrl: true },
  });

  if (!estudiante) {
    throw new Error('Estudiante no encontrado');
  }

  const ciclo = await prisma.cicloLectivo.findFirst({
    where: { id: cicloLectivoId, institucionId },
  });

  if (!ciclo) {
    throw new Error('Ciclo lectivo no encontrado');
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
    orderBy: { clase: { materia: { nombre: 'asc' } } },
  });

  // Calcular promedio general
  const promedios = calificaciones.map((c) => c.promedioFinal || 0).filter((p) => p > 0);
  const promedioGeneral =
    promedios.length > 0 ? promedios.reduce((a, b) => a + b, 0) / promedios.length : 0;

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
    })),
    promedioGeneral: Math.round(promedioGeneral * 100) / 100,
  };
};

// Guardar calificaciones masivas (para un periodo específico)
export const guardarCalificacionesMasivas = async (
  claseId: string,
  periodo: 'p1' | 'p2' | 'p3' | 'p4',
  calificaciones: { estudianteId: string; nota: number }[],
  institucionId: string
) => {
  const clase = await validarAccesoClase(claseId, institucionId);

  const resultados = {
    exitosos: 0,
    fallidos: [] as { estudianteId: string; error: string }[],
  };

  for (const cal of calificaciones) {
    try {
      await guardarCalificacion(
        {
          estudianteId: cal.estudianteId,
          claseId,
          [periodo]: cal.nota,
        },
        institucionId
      );
      resultados.exitosos++;
    } catch (error: any) {
      resultados.fallidos.push({ estudianteId: cal.estudianteId, error: error.message });
    }
  }

  return resultados;
};
