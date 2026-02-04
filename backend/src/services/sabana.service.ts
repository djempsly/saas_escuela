/**
 * Servicio para Sábana de Notas
 * Implementa la lógica de consulta de calificaciones según formato MINERD/MENFP
 */

import { SistemaEducativo } from '@prisma/client';
import prisma from '../config/db';

export interface SabanaCalificacion {
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
  promedio: number | null;
  // Completiva (MINERD format)
  cpc30: number | null; // 50% PCP for completiva
  cpcTotal: number | null; // 50% CPC
  cc: number | null; // C.C. - Calificación Completiva
  // Extraordinaria (MINERD format)
  cpex30: number | null; // 30% PCP
  cpex70: number | null; // 70% CPEx
  cex: number | null; // C.Ex - Calificación Extraordinaria
  // Final
  promedioFinal: number | null;
  situacion: string | null;
  // Metadata
  claseId: string | null;
  docenteId: string | null;
  docenteNombre: string | null;
}

export interface SabanaEstudiante {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
  calificaciones: {
    [materiaId: string]: SabanaCalificacion;
  };
}

export interface SabanaMateria {
  id: string;
  nombre: string;
  codigo: string | null;
  esOficial: boolean;
  orden: number;
  tipo: string;
}

export interface SabanaData {
  nivel: {
    id: string;
    nombre: string;
    gradoNumero: number | null;
  };
  cicloLectivo: {
    id: string;
    nombre: string;
  };
  sistemaEducativo: SistemaEducativo;
  numeroPeriodos: number; // 4 para DO, 3 para HT
  materias: SabanaMateria[];
  estudiantes: SabanaEstudiante[];
  metadatos: {
    totalEstudiantes: number;
    totalMaterias: number;
    fechaGeneracion: string;
    pais: string;
  };
}

/**
 * Obtiene los datos de la sábana de notas para un nivel específico
 */
export const getSabanaByNivel = async (
  nivelId: string,
  cicloLectivoId: string,
  institucionId: string
): Promise<SabanaData> => {
  // 1. Obtener el nivel con su información
  const nivel = await prisma.nivel.findUnique({
    where: { id: nivelId },
    include: {
      institucion: {
        select: {
          id: true,
          pais: true,
          sistema: true,
        },
      },
      cicloEducativo: true,
    },
  });

  if (!nivel) {
    throw new Error('Nivel no encontrado');
  }

  if (nivel.institucionId !== institucionId) {
    throw new Error('El nivel no pertenece a esta institución');
  }

  // 2. Obtener el ciclo lectivo
  const cicloLectivo = await prisma.cicloLectivo.findUnique({
    where: { id: cicloLectivoId },
  });

  if (!cicloLectivo) {
    throw new Error('Ciclo lectivo no encontrado');
  }

  if (cicloLectivo.institucionId !== institucionId) {
    throw new Error('El ciclo lectivo no pertenece a esta institución');
  }

  // 3. Determinar el número de períodos según el país
  const pais = nivel.institucion.pais;
  const numeroPeriodos = pais === 'HT' ? 3 : 4;

  // 4. Obtener todas las materias oficiales O TÉCNICAS de la institución
  const materiasDb = await prisma.materia.findMany({
    where: {
      institucionId,
      OR: [
        { esOficial: true },
        { tipo: 'TECNICA' }
      ]
    },
    orderBy: { orden: 'asc' },
  });

  const materias: SabanaMateria[] = materiasDb.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    codigo: m.codigo,
    esOficial: m.esOficial,
    orden: m.orden,
    tipo: m.tipo,
  }));

  // 5. Obtener todas las clases del nivel para el ciclo lectivo actual
  const clases = await prisma.clase.findMany({
    where: {
      nivelId,
      cicloLectivoId,
    },
    include: {
      materia: {
        select: {
          id: true,
          nombre: true,
        },
      },
      docente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
        },
      },
      inscripciones: {
        include: {
          estudiante: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              fotoUrl: true,
            },
          },
        },
      },
    },
  });

  // Mapa para buscar clases por ID rápidamente
  const claseById = new Map<string, typeof clases[0]>();
  for (const clase of clases) {
    claseById.set(clase.id, clase);
  }

  // 6. Crear un mapa de estudiantes únicos
  const estudiantesMap = new Map<
    string,
    {
      id: string;
      nombre: string;
      apellido: string;
      fotoUrl: string | null;
      clases: Set<string>;
    }
  >();

  for (const clase of clases) {
    for (const inscripcion of clase.inscripciones) {
      const est = inscripcion.estudiante;
      if (!estudiantesMap.has(est.id)) {
        estudiantesMap.set(est.id, {
          id: est.id,
          nombre: est.nombre,
          apellido: est.apellido,
          fotoUrl: est.fotoUrl,
          clases: new Set([clase.id]),
        });
      } else {
        estudiantesMap.get(est.id)!.clases.add(clase.id);
      }
    }
  }

  // 7. Obtener todas las calificaciones de las clases para este ciclo lectivo
  const calificaciones = await prisma.calificacion.findMany({
    where: {
      claseId: { in: clases.map((c) => c.id) },
      cicloLectivoId,
    },
  });

  // Crear mapa de calificaciones: estudianteId -> materiaId -> calificación
  const calificacionesMap = new Map<string, Map<string, typeof calificaciones[0]>>();
  for (const cal of calificaciones) {
    // Encontrar la clase para obtener la materia
    const clase = claseById.get(cal.claseId);
    if (!clase) continue;

    if (!calificacionesMap.has(cal.estudianteId)) {
      calificacionesMap.set(cal.estudianteId, new Map());
    }
    calificacionesMap.get(cal.estudianteId)!.set(clase.materia.id, cal);
  }

  // 8. Construir los datos de estudiantes con sus calificaciones
  const estudiantes: SabanaEstudiante[] = Array.from(estudiantesMap.values())
    .sort((a, b) => a.apellido.localeCompare(b.apellido))
    .map((est) => {
      const calificacionesEst: SabanaEstudiante['calificaciones'] = {};

      for (const materia of materias) {
        // Encontrar la clase específica de esta materia en la que el estudiante está inscrito
        let claseEstudiante: typeof clases[0] | null = null;
        for (const claseId of est.clases) {
          const c = claseById.get(claseId);
          if (c && c.materia.id === materia.id) {
            claseEstudiante = c;
            break;
          }
        }

        const cal = calificacionesMap.get(est.id)?.get(materia.id);
        
        // Determinar la clase final para metadatos (prioridad: inscripción, luego la de la calificación)
        const claseFinal = claseEstudiante || (cal ? claseById.get(cal.claseId) : null);

        if (cal) {
          // Calcular promedio según el número de períodos
          let sumaPeriodos = 0;
          let periodosConNota = 0;
          if (cal.p1 !== null && cal.p1 !== 0) { sumaPeriodos += cal.p1; periodosConNota++; }
          if (cal.p2 !== null && cal.p2 !== 0) { sumaPeriodos += cal.p2; periodosConNota++; }
          if (cal.p3 !== null && cal.p3 !== 0) { sumaPeriodos += cal.p3; periodosConNota++; }
          if (numeroPeriodos === 4 && cal.p4 !== null && cal.p4 !== 0) { sumaPeriodos += cal.p4; periodosConNota++; }

          const promedio = periodosConNota > 0 ? Math.round((sumaPeriodos / periodosConNota) * 10) / 10 : null;

          calificacionesEst[materia.id] = {
            p1: cal.p1,
            p2: cal.p2,
            p3: cal.p3,
            p4: numeroPeriodos === 4 ? cal.p4 : null,
            rp1: cal.rp1,
            rp2: cal.rp2,
            rp3: cal.rp3,
            rp4: numeroPeriodos === 4 ? cal.rp4 : null,
            promedio,
            // Completiva fields from DB
            cpc30: cal.cpc_30,
            cpcTotal: cal.cpc_total,
            cc: cal.cpc_total, // C.C. is same as cpc_total
            // Extraordinaria fields from DB
            cpex30: cal.cpex_70 ? (promedio ?? 0) * 0.3 : null, // 30% of PCP
            cpex70: cal.cpex_70,
            cex: cal.cpex_total,
            // Final
            promedioFinal: cal.promedioFinal,
            situacion: cal.situacion,
            // Metadata
            claseId: claseFinal?.id || null,
            docenteId: claseFinal?.docente?.id || null,
            docenteNombre: claseFinal?.docente ? `${claseFinal.docente.nombre} ${claseFinal.docente.apellido}` : null,
          };
        } else {
          // El estudiante no está inscrito en esta materia o no tiene calificación
          calificacionesEst[materia.id] = {
            p1: null,
            p2: null,
            p3: null,
            p4: null,
            rp1: null,
            rp2: null,
            rp3: null,
            rp4: null,
            promedio: null,
            cpc30: null,
            cpcTotal: null,
            cc: null,
            cpex30: null,
            cpex70: null,
            cex: null,
            promedioFinal: null,
            situacion: null,
            claseId: claseFinal?.id || null, // Puede haber clase pero no calificación
            docenteId: claseFinal?.docente?.id || null,
            docenteNombre: claseFinal?.docente ? `${claseFinal.docente.nombre} ${claseFinal.docente.apellido}` : null,
          };
        }
      }

      return {
        id: est.id,
        nombre: est.nombre,
        apellido: est.apellido,
        fotoUrl: est.fotoUrl,
        calificaciones: calificacionesEst,
      };
    });

  return {
    nivel: {
      id: nivel.id,
      nombre: nivel.nombre,
      gradoNumero: nivel.gradoNumero,
    },
    cicloLectivo: {
      id: cicloLectivo.id,
      nombre: cicloLectivo.nombre,
    },
    sistemaEducativo: nivel.institucion.sistema,
    numeroPeriodos,
    materias,
    estudiantes,
    metadatos: {
      totalEstudiantes: estudiantes.length,
      totalMaterias: materias.length,
      fechaGeneracion: new Date().toISOString(),
      pais,
    },
  };
};

/**
 * Obtiene la lista de niveles disponibles para la sábana de notas
 * Filtra por docente si se proporciona userId y userRole es DOCENTE
 */
export const getNivelesParaSabana = async (institucionId: string, userId?: string, userRole?: string) => {
  const where: any = { institucionId };

  // Si es docente, solo devolver niveles donde tiene clases
  if (userRole === 'DOCENTE' && userId) {
    where.clases = {
      some: {
        docenteId: userId
      }
    };
  }

  return prisma.nivel.findMany({
    where,
    orderBy: [{ gradoNumero: 'asc' }, { nombre: 'asc' }],
    include: {
      cicloEducativo: {
        select: {
          id: true,
          nombre: true,
        },
      },
      _count: {
        select: {
          clases: true,
        },
      },
    },
  });
};

/**
 * Obtiene los ciclos lectivos para la institución (activos primero, luego históricos)
 */
export const getCiclosLectivosParaSabana = async (institucionId: string) => {
  return prisma.cicloLectivo.findMany({
    where: {
      institucionId,
    },
    orderBy: [
      { activo: 'desc' }, // Active cycles first
      { fechaInicio: 'desc' },
    ],
  });
};

/**
 * Actualiza una calificación específica en la sábana
 * Solo puede hacerlo el docente de la clase o el director
 */
export const updateCalificacionSabana = async (
  claseId: string,
  estudianteId: string,
  periodo: 'p1' | 'p2' | 'p3' | 'p4' | 'rp1' | 'rp2' | 'rp3' | 'rp4',
  valor: number | null,
  userId: string,
  userRole: string,
  userInstitucionId: string
) => {
  // Verificar que la clase existe y pertenece a la institución
  const clase = await prisma.clase.findUnique({
    where: { id: claseId },
    include: {
      nivel: {
        include: {
          institucion: true,
        },
      },
      cicloLectivo: true,
    },
  });

  if (!clase) {
    throw new Error('Clase no encontrada');
  }

  if (clase.nivel.institucionId !== userInstitucionId) {
    throw new Error('No tiene permisos para modificar esta clase');
  }

  // Verificar permisos: Solo el docente de la clase o el director pueden editar
  const esDocente = clase.docenteId === userId;
  const esDirector = userRole === 'DIRECTOR';

  if (!esDocente && !esDirector) {
    throw new Error('Solo el docente asignado o el director pueden modificar calificaciones');
  }

  // Verificar que el estudiante está inscrito en la clase
  const inscripcion = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_claseId: {
        estudianteId,
        claseId,
      },
    },
  });

  if (!inscripcion) {
    throw new Error('El estudiante no está inscrito en esta clase');
  }

  // Buscar calificación existente o crear una nueva
  const calificacionExistente = await prisma.calificacion.findUnique({
    where: {
      estudianteId_claseId_cicloLectivoId: {
        estudianteId,
        claseId,
        cicloLectivoId: clase.cicloLectivoId,
      },
    },
  });

  if (calificacionExistente) {
    return prisma.calificacion.update({
      where: { id: calificacionExistente.id },
      data: { [periodo]: valor },
    });
  } else {
    return prisma.calificacion.create({
      data: {
        estudianteId,
        claseId,
        cicloLectivoId: clase.cicloLectivoId,
        [periodo]: valor,
      },
    });
  }
};