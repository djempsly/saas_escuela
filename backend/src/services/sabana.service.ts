/**
 * Servicio para Sábana de Notas
 * Implementa la lógica de consulta de calificaciones según formato MINERD/MENFP
 * Soporta: Primaria, Secundaria General, y Politécnico (Módulos Técnicos con RA)
 */

import { SistemaEducativo } from '@prisma/client';
import prisma from '../config/db';

export interface SabanaCalificacion {
  // Notas Generales (P1-P4)
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
  promedio: number | null;
  
  // Recuperación (Secundaria)
  cpc30: number | null;
  cpcTotal: number | null;
  cc: number | null;
  cpex30: number | null;
  cpex70: number | null;
  cex: number | null;
  promedioFinal: number | null;
  situacion: string | null;

  // Notas Técnicas (RA) - Map dinámico: "RA1": 85, "RA2": 90
  ras: { [key: string]: number };

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
  tipo: string; // GENERAL | TECNICA
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
  sistemaEducativo: SistemaEducativo; // El sistema específico para ESTE nivel
  numeroPeriodos: number;
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
 * Helper para detectar el sistema educativo basado en el Nivel/Ciclo
 * Permite manejar instituciones mixtas (Primaria + Secundaria)
 */
const detectarSistemaEducativo = (
  nivel: any,
  institucionSistemaDefault: SistemaEducativo
): SistemaEducativo => {
  const nivelNombre = nivel.nombre.toUpperCase();
  const cicloNombre = nivel.cicloEducativo?.nombre.toUpperCase() || '';

  // Detección Primaria / Fundamental
  if (
    nivelNombre.includes('PRIMARIA') || 
    cicloNombre.includes('PRIMARIA') || 
    cicloNombre.includes('PRIMER CICLO') ||
    nivelNombre.includes('FONDAMENTAL') || // HT
    cicloNombre.includes('FONDAMENTAL')    // HT
  ) {
    return institucionSistemaDefault.includes('HT') ? 'PRIMARIA_HT' : 'PRIMARIA_DO';
  }

  // Detección Secundaria
  if (
    nivelNombre.includes('SECUNDARIA') || 
    cicloNombre.includes('SECUNDARIA') ||
    nivelNombre.includes('SECONDAIRE') || // HT (Nouveau Secondaire)
    cicloNombre.includes('SECONDAIRE')    // HT
  ) {
    return institucionSistemaDefault.includes('HT') ? 'SECUNDARIA_HT' : institucionSistemaDefault;
  }

  return institucionSistemaDefault;
};

/**
 * Obtiene los datos de la sábana de notas para un nivel específico
 */
export const getSabanaByNivel = async (
  nivelId: string,
  cicloLectivoId: string,
  institucionId: string
): Promise<SabanaData> => {
  // 1. Obtener el nivel y ciclo
  const nivel = await prisma.nivel.findUnique({
    where: { id: nivelId },
    include: {
      institucion: { select: { id: true, pais: true, sistema: true } },
      cicloEducativo: true,
    },
  });

  if (!nivel || nivel.institucionId !== institucionId) throw new Error('Nivel no encontrado');

  const cicloLectivo = await prisma.cicloLectivo.findUnique({ where: { id: cicloLectivoId } });
  if (!cicloLectivo || cicloLectivo.institucionId !== institucionId) throw new Error('Ciclo lectivo no encontrado');

  // 2. Determinar Sistema y Periodos
  const sistemaEducativo = detectarSistemaEducativo(nivel, nivel.institucion.sistema);
  // Estándar general es 4 periodos (4 Parciales DO / 4 Contrôles HT). 
  // Si se requiere trimestral (3), se debería configurar a nivel de institución, pero por defecto usaremos 4 para compatibilidad visual.
  const numeroPeriodos = 4;

  // 3. Obtener Materias (Generales y Técnicas)
  const materiasDb = await prisma.materia.findMany({
    where: {
      institucionId,
      OR: [{ esOficial: true }, { tipo: 'TECNICA' }]
    },
    orderBy: { orden: 'asc' },
  });

  const materias: SabanaMateria[] = materiasDb.map(m => ({
    id: m.id,
    nombre: m.nombre,
    codigo: m.codigo,
    esOficial: m.esOficial,
    orden: m.orden,
    tipo: m.tipo,
  }));

  // 4. Obtener Clases y Estudiantes
  const clases = await prisma.clase.findMany({
    where: { nivelId, cicloLectivoId },
    include: {
      materia: { select: { id: true, nombre: true, tipo: true } },
      docente: { select: { id: true, nombre: true, apellido: true } },
      inscripciones: {
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } }
        }
      }
    }
  });

  // Mapa de Clases por ID
  const claseById = new Map(clases.map(c => [c.id, c]));

  // Mapa de Estudiantes Únicos
  const estudiantesMap = new Map<string, {
    id: string;
    nombre: string;
    apellido: string;
    fotoUrl: string | null;
    clases: Set<string>; // IDs de clases donde está inscrito
  }>();

  for (const clase of clases) {
    for (const insc of clase.inscripciones) {
      if (!estudiantesMap.has(insc.estudianteId)) {
        estudiantesMap.set(insc.estudianteId, {
          id: insc.estudiante.id,
          nombre: insc.estudiante.nombre,
          apellido: insc.estudiante.apellido,
          fotoUrl: insc.estudiante.fotoUrl,
          clases: new Set([clase.id])
        });
      } else {
        estudiantesMap.get(insc.estudianteId)!.clases.add(clase.id);
      }
    }
  }

  // 5. Obtener Calificaciones (Generales y Técnicas)
  const claseIds = clases.map(c => c.id);

  // A. Calificaciones Generales
  const calificacionesGenerales = await prisma.calificacion.findMany({
    where: { claseId: { in: claseIds }, cicloLectivoId },
  });

  // B. Calificaciones Técnicas (RA)
  // Nota: CalificacionTecnica no tiene cicloLectivoId directo, se infiere por la clase -> ciclo
  const calificacionesTecnicas = await prisma.calificacionTecnica.findMany({
    where: { claseId: { in: claseIds } }
  });

  // Organizar Calificaciones
  // Map<EstudianteId, Map<MateriaId, { general: Calificacion?, tecnicas: CalificacionTecnica[] }>>
  const notasMap = new Map<string, Map<string, { general?: any, tecnicas: any[] }>>();

  // Helper para inicializar mapa
  const getNotaEntry = (estId: string, matId: string) => {
    if (!notasMap.has(estId)) notasMap.set(estId, new Map());
    if (!notasMap.get(estId)!.has(matId)) {
      notasMap.get(estId)!.set(matId, { general: undefined, tecnicas: [] });
    }
    return notasMap.get(estId)!.get(matId)!;
  };

  // Llenar Generales
  for (const cal of calificacionesGenerales) {
    const clase = claseById.get(cal.claseId);
    if (!clase) continue;
    const entry = getNotaEntry(cal.estudianteId, clase.materia.id);
    entry.general = cal;
  }

  // Llenar Técnicas
  for (const cal of calificacionesTecnicas) {
    const clase = claseById.get(cal.claseId);
    if (!clase) continue;
    const entry = getNotaEntry(cal.estudianteId, clase.materia.id);
    entry.tecnicas.push(cal);
  }

  // 6. Construir Respuesta Final
  const estudiantes: SabanaEstudiante[] = Array.from(estudiantesMap.values())
    .sort((a, b) => a.apellido.localeCompare(b.apellido))
    .map(est => {
      const califsEst: SabanaEstudiante['calificaciones'] = {};

      for (const materia of materias) {
        // 1. Buscar si hay una clase para esta materia en este nivel (independiente del estudiante)
        // Esto permite saber quién es el docente de esta materia en este nivel
        const claseNivelMateria = clases.find(c => c.materia.id === materia.id);

        // 2. Buscar si el estudiante está explícitamente inscrito en esa clase
        let claseEstudiante = null;
        for (const cid of est.clases) {
          const c = claseById.get(cid);
          if (c && c.materia.id === materia.id) {
            claseEstudiante = c;
            break;
          }
        }

        const notas = notasMap.get(est.id)?.get(materia.id);
        const general = notas?.general;
        const tecnicas = notas?.tecnicas || [];

        // Calcular promedio general si existe
        let promedio = null;
        if (general) {
          let suma = 0, count = 0;
          if (general.p1) { suma += general.p1; count++; }
          if (general.p2) { suma += general.p2; count++; }
          if (general.p3) { suma += general.p3; count++; }
          if (numeroPeriodos === 4 && general.p4) { suma += general.p4; count++; }
          if (count > 0) promedio = Math.round((suma / count) * 10) / 10;
        }

        // Mapear RAs (RA1, RA2...) -> valor
        const rasMap: { [key: string]: number } = {};
        tecnicas.forEach((t: any) => {
          // Asumimos t.ra_codigo es algo como "RA1", "RA2"
          // O normalizamos el código para que sea clave válida
          rasMap[t.ra_codigo] = t.valor;
        });

        // Clase final para metadata (inscripción, clase del nivel o la de la nota)
        const claseFinal = claseEstudiante || claseNivelMateria || (general ? claseById.get(general.claseId) : null);

        califsEst[materia.id] = {
          p1: general?.p1 ?? null,
          p2: general?.p2 ?? null,
          p3: general?.p3 ?? null,
          p4: numeroPeriodos === 4 ? general?.p4 : null,
          rp1: general?.rp1 ?? null,
          rp2: general?.rp2 ?? null,
          rp3: general?.rp3 ?? null,
          rp4: numeroPeriodos === 4 ? general?.rp4 : null,
          promedio: general?.promedio || promedio, // Usar promedio pre-calculado si existe en DB o calculado aquí
          cpc30: general?.cpc_30 ?? null,
          cpcTotal: general?.cpc_total ?? null,
          cc: general?.cpc_total ?? null,
          cpex30: general?.cpex_70 ? (promedio ?? 0) * 0.3 : null,
          cpex70: general?.cpex_70 ?? null,
          cex: general?.cpex_total ?? null,
          promedioFinal: general?.promedioFinal ?? null,
          situacion: general?.situacion ?? null,
          ras: rasMap,
          claseId: claseFinal?.id || null,
          docenteId: claseFinal?.docente?.id || null,
          docenteNombre: claseFinal?.docente ? `${claseFinal.docente.nombre} ${claseFinal.docente.apellido}` : null,
        };
      }

      return {
        id: est.id,
        nombre: est.nombre,
        apellido: est.apellido,
        fotoUrl: est.fotoUrl,
        calificaciones: califsEst
      };
    });

  return {
    nivel: { id: nivel.id, nombre: nivel.nombre, gradoNumero: nivel.gradoNumero },
    cicloLectivo: { id: cicloLectivo.id, nombre: cicloLectivo.nombre },
    sistemaEducativo,
    numeroPeriodos,
    materias,
    estudiantes,
    metadatos: {
      totalEstudiantes: estudiantes.length,
      totalMaterias: materias.length,
      fechaGeneracion: new Date().toISOString(),
      pais: nivel.institucion.pais,
    }
  };
};

/**
 * Obtiene la lista de niveles disponibles para la sábana de notas
 */
export const getNivelesParaSabana = async (institucionId: string, userId?: string, userRole?: string) => {
  const where: any = { institucionId };
  if (userRole === 'DOCENTE' && userId) {
    where.clases = { some: { docenteId: userId } };
  }

  return prisma.nivel.findMany({
    where,
    orderBy: [{ gradoNumero: 'asc' }, { nombre: 'asc' }],
    include: {
      cicloEducativo: { select: { id: true, nombre: true } },
      _count: { select: { clases: true } },
    },
  });
};

/**
 * Obtiene los ciclos lectivos para la institución
 */
export const getCiclosLectivosParaSabana = async (institucionId: string) => {
  return prisma.cicloLectivo.findMany({
    where: { institucionId },
    orderBy: [{ activo: 'desc' }, { fechaInicio: 'desc' }],
  });
};

/**
 * Actualiza calificación
 * Soporta actualización de notas generales (P1-P4) y técnicas (RA)
 */
export const updateCalificacionSabana = async (
  claseId: string,
  estudianteId: string,
  periodo: string, // 'p1'...'p4' OR 'RA1'...'RA10'
  valor: number | null,
  userId: string,
  userRole: string,
  userInstitucionId: string
) => {
  const clase = await prisma.clase.findUnique({
    where: { id: claseId },
    include: {
      materia: true,
      cicloLectivo: true,
      nivel: { include: { institucion: true } }
    }
  });

  if (!clase) throw new Error('Clase no encontrada');
  if (clase.nivel.institucionId !== userInstitucionId) throw new Error('Sin permiso');
  
  // Bloquear edición si el ciclo no está activo
  if (!clase.cicloLectivo.activo) {
    throw new Error('No se pueden editar calificaciones de un ciclo lectivo inactivo');
  }

  const esDocente = clase.docenteId === userId;
  const esDirector = userRole === 'DIRECTOR';
  if (!esDocente && !esDirector) throw new Error('Sin permiso para editar');

  // Detectar si es una nota técnica (RA)
  const isRA = periodo.toUpperCase().startsWith('RA');

  if (isRA) {
    // Actualizar CalificacionTecnica
    // periodo viene como "RA1", "RA2". Usaremos eso como ra_codigo.
    const raCodigo = periodo.toUpperCase();
    
    if (valor === null) {
      // Eliminar si es null? O poner 0? Generalmente se borra o se pone 0.
      // Prisma delete si existe.
      await prisma.calificacionTecnica.deleteMany({
        where: {
          estudianteId,
          claseId,
          ra_codigo: raCodigo
        }
      });
      return { status: 'deleted' };
    }

    // Upsert
    return prisma.calificacionTecnica.upsert({
      where: {
        estudianteId_claseId_ra_codigo: {
          estudianteId,
          claseId,
          ra_codigo: raCodigo
        }
      },
      update: { valor },
      create: {
        estudianteId,
        claseId,
        ra_codigo: raCodigo,
        valor
      }
    });

  } else {
    // Actualizar Calificacion General (P1, P2...)
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
  }
};
