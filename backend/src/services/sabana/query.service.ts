/**
 * Servicio para Sábana de Notas — Consultas
 * Implementa la lógica de consulta de calificaciones según formato MINERD/MENFP
 * Soporta: Primaria, Secundaria General, y Politécnico (Módulos Técnicos con RA)
 */

import { SistemaEducativo, FormatoSabana, Calificacion, CalificacionTecnica, CalificacionCompetencia } from '@prisma/client';
import prisma from '../../config/db';
import { logger } from '../../config/logger';
import { redis } from '../../config/redis';
import { NotFoundError } from '../../errors';
import { getCoordinadorNivelIds } from '../../utils/coordinador.utils';

// Cache
const SABANA_CACHE_TTL = 3600; // 1 hora
const sabanaKey = (nivelId: string, cicloLectivoId: string) =>
  `sabana:${nivelId}:${cicloLectivoId}`;

export const invalidarCacheSabana = async (
  nivelId: string,
  cicloLectivoId: string,
): Promise<void> => {
  try {
    await redis.del(sabanaKey(nivelId, cicloLectivoId));
  } catch (err) {
    logger.error({ err, nivelId, cicloLectivoId }, 'Error invalidando caché de sábana');
  }
};

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
  cpcNota: number | null;
  cpcTotal: number | null;
  cc: number | null;
  cpex30: number | null;
  cpexNota: number | null;
  cpex70: number | null;
  cex: number | null;
  promedioFinal: number | null;
  situacion: string | null;

  // Notas por Competencia (Map dinámico por ID de competencia)
  competencias: {
    [competenciaId: string]: {
      p1: number | null;
      p2: number | null;
      p3: number | null;
      p4: number | null;
      rp1: number | null;
      rp2: number | null;
      rp3: number | null;
      rp4: number | null;
    };
  };

  // Notas Técnicas (RA) - Map dinámico: "RA1": 85, "RA2": 90
  ras: { [key: string]: number };

  // Metadata
  claseId: string | null;
  docenteId: string | null;
  docenteNombre: string | null;
  publicado: boolean;
  observaciones: string | null;
}

export interface SabanaEstudiante {
  id: string;
  nombre: string;
  segundoNombre: string | null;
  apellido: string;
  segundoApellido: string | null;
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
  formatoSabana: FormatoSabana;
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
 * Fallback: detecta formato por keywords en el nombre del nivel/ciclo.
 * Solo se usa para niveles migrados que aún tienen el default de migración.
 */
const detectarFormatoPorKeyword = (
  nivelNombre: string,
  cicloNombre: string,
  esHT: boolean,
): FormatoSabana | null => {
  const n = nivelNombre.toUpperCase();
  const c = cicloNombre.toUpperCase();

  if (n.includes('INICIAL') || c.includes('INICIAL') || n.includes('PRESCOLAIRE') || c.includes('PRESCOLAIRE')) {
    return esHT ? 'INICIAL_HT' : 'INICIAL_DO';
  }

  if (
    n.includes('PRIMARIA') || c.includes('PRIMARIA') || c.includes('PRIMER CICLO') ||
    n.includes('FONDAMENTAL') || c.includes('FONDAMENTAL')
  ) {
    return esHT ? 'PRIMARIA_HT' : 'PRIMARIA_DO';
  }

  if (
    n.includes('SECUNDARIA') || c.includes('SECUNDARIA') ||
    n.includes('SECONDAIRE') || c.includes('SECONDAIRE')
  ) {
    return esHT ? 'SECUNDARIA_HT' : 'SECUNDARIA_DO';
  }

  if (n.includes('POLITECNICO') || c.includes('POLITECNICO')) {
    return 'POLITECNICO_DO';
  }

  return null;
};

/**
 * Determina el FormatoSabana para un nivel.
 * Usa nivel.formatoSabana directamente. Si el valor es el default de migración
 * (SECUNDARIA_DO) y keyword matching sugiere algo diferente, usa el fallback.
 */
const detectarFormatoSabana = (
  nivel: { id: string; nombre: string; formatoSabana: FormatoSabana; cicloEducativo?: { nombre: string } | null },
  institucionSistema: SistemaEducativo,
): FormatoSabana => {
  // Si fue configurado explícitamente (no es el default de migración), usar directo
  if (nivel.formatoSabana !== 'SECUNDARIA_DO') {
    return nivel.formatoSabana;
  }

  // formatoSabana es SECUNDARIA_DO (posible default de migración)
  // Verificar con keyword matching si el nombre sugiere otro formato
  const esHT = institucionSistema.includes('HT');
  const formatoByKeyword = detectarFormatoPorKeyword(
    nivel.nombre,
    nivel.cicloEducativo?.nombre || '',
    esHT,
  );

  if (formatoByKeyword && formatoByKeyword !== 'SECUNDARIA_DO') {
    logger.warn(
      {
        nivelId: nivel.id,
        nivelNombre: nivel.nombre,
        formatoSabanaActual: nivel.formatoSabana,
        formatoDetectado: formatoByKeyword,
      },
      'Nivel con formatoSabana default no coincide con su nombre. Usando detección por keyword. Actualice nivel.formatoSabana.',
    );
    return formatoByKeyword;
  }

  return nivel.formatoSabana;
};

/**
 * Obtiene los datos de la sábana de notas para un nivel específico
 */
export const getSabanaByNivel = async (
  nivelId: string,
  cicloLectivoId: string,
  institucionId: string,
  userId?: string,
): Promise<SabanaData> => {
  // 1. Obtener el nivel y ciclo
  const nivel = await prisma.nivel.findUnique({
    where: { id: nivelId },
    include: {
      institucion: { select: { id: true, pais: true, sistema: true } },
      cicloEducativo: true,
    },
  });

  if (!nivel || nivel.institucionId !== institucionId) throw new NotFoundError('Nivel no encontrado');

  const cicloLectivo = await prisma.cicloLectivo.findUnique({ where: { id: cicloLectivoId } });
  if (!cicloLectivo || cicloLectivo.institucionId !== institucionId)
    throw new NotFoundError('Ciclo lectivo no encontrado');

  // Cache: buscar en Redis
  const cacheKey = sabanaKey(nivelId, cicloLectivoId);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SabanaData;
    }
  } catch (err) {
    logger.error({ err }, 'Error leyendo caché de sábana');
  }

  // 2. Determinar Formato y Periodos
  const formatoSabana = detectarFormatoSabana(nivel, nivel.institucion.sistema);
  const numeroPeriodos = nivel.numeroPeriodos;

  // 3. Obtener Materias (Todas las de la institución)
  const materias: SabanaMateria[] = await prisma.materia.findMany({
    where: { institucionId },
    orderBy: { orden: 'asc' },
    select: { id: true, nombre: true, codigo: true, esOficial: true, orden: true, tipo: true },
  });

  // 4. Obtener Clases y Estudiantes
  const clases = await prisma.clase.findMany({
    where: { nivelId, cicloLectivoId },
    include: {
      materia: { select: { id: true, nombre: true, tipo: true } },
      docente: { select: { id: true, nombre: true, apellido: true } },
      inscripciones: {
        include: {
          estudiante: {
            select: {
              id: true,
              nombre: true,
              segundoNombre: true,
              apellido: true,
              segundoApellido: true,
              fotoUrl: true,
            },
          },
        },
      },
    },
  });

  // Mapa de Clases por ID
  const claseById = new Map(clases.map((c) => [c.id, c]));

  // Mapa de Estudiantes Únicos
  const estudiantesMap = new Map<
    string,
    {
      id: string;
      nombre: string;
      segundoNombre: string | null;
      apellido: string;
      segundoApellido: string | null;
      fotoUrl: string | null;
      clases: Set<string>; // IDs de clases donde está inscrito
    }
  >();

  for (const clase of clases) {
    for (const insc of clase.inscripciones) {
      if (!estudiantesMap.has(insc.estudianteId)) {
        estudiantesMap.set(insc.estudianteId, {
          id: insc.estudiante.id,
          nombre: insc.estudiante.nombre,
          segundoNombre: insc.estudiante.segundoNombre,
          apellido: insc.estudiante.apellido,
          segundoApellido: insc.estudiante.segundoApellido,
          fotoUrl: insc.estudiante.fotoUrl,
          clases: new Set([clase.id]),
        });
      } else {
        estudiantesMap.get(insc.estudianteId)!.clases.add(clase.id);
      }
    }
  }

  // 5. Obtener Calificaciones (Generales, Técnicas y Competencias)
  const claseIds = clases.map((c) => c.id);

  // A. Calificaciones Generales
  const calificacionesGenerales = await prisma.calificacion.findMany({
    where: { claseId: { in: claseIds }, cicloLectivoId },
  });

  // B. Calificaciones Técnicas (RA)
  const calificacionesTecnicas = await prisma.calificacionTecnica.findMany({
    where: { claseId: { in: claseIds } },
  });

  // C. Calificaciones por Competencia (NUEVO)
  const calificacionesCompetencia = await prisma.calificacionCompetencia.findMany({
    where: { claseId: { in: claseIds }, cicloLectivoId },
  });

  // Organizar Calificaciones
  // Map<EstudianteId, Map<MateriaId, { general?: Calificacion, tecnicas: CalificacionTecnica[], competencias: CalificacionCompetencia[] }>>
  const notasMap = new Map<
    string,
    Map<string, { general?: Calificacion; tecnicas: CalificacionTecnica[]; competencias: CalificacionCompetencia[] }>
  >();

  // Helper para inicializar mapa
  const getNotaEntry = (estId: string, matId: string) => {
    if (!notasMap.has(estId)) notasMap.set(estId, new Map());
    if (!notasMap.get(estId)!.has(matId)) {
      notasMap.get(estId)!.set(matId, { general: undefined, tecnicas: [], competencias: [] });
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

  // Llenar Competencias (NUEVO)
  for (const comp of calificacionesCompetencia) {
    const clase = claseById.get(comp.claseId);
    if (!clase) continue;
    const entry = getNotaEntry(comp.estudianteId, clase.materia.id);
    entry.competencias.push(comp);
  }

  // 6. Construir Respuesta Final
  const estudiantes: SabanaEstudiante[] = Array.from(estudiantesMap.values())
    .sort((a, b) => a.apellido.localeCompare(b.apellido))
    .map((est) => {
      const califsEst: SabanaEstudiante['calificaciones'] = {};

      for (const materia of materias) {
        // ... (lógica de detección de clase igual)
        const claseNivelMateria = clases.find((c) => c.materia.id === materia.id);
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
        const competenciasRaw = notas?.competencias || [];

        // 1. Mapear Competencias (ID -> objeto notas)
        const competenciasMap: SabanaCalificacion['competencias'] = {};
        competenciasRaw.forEach((c) => {
          competenciasMap[c.competencia] = {
            p1: c.p1 ?? null,
            p2: c.p2 ?? null,
            p3: c.p3 ?? null,
            p4: c.p4 ?? null,
            rp1: c.rp1 ?? null,
            rp2: c.rp2 ?? null,
            rp3: c.rp3 ?? null,
            rp4: c.rp4 ?? null,
          };
        });

        // 2. CALCULAR PROMEDIOS GENERALES DE LA MATERIA (Basado en competencias)
        // Esto asegura que p1, p2, p3, p4 de la materia sean el promedio de sus competencias
        const periodos = ['p1', 'p2', 'p3', 'p4', 'rp1', 'rp2', 'rp3', 'rp4'];
        const mPromedios: Record<string, number | null> = {};

        periodos.forEach((p) => {
          let suma = 0;
          let count = 0;
          Object.values(competenciasMap).forEach((comp) => {
            const val = comp[p as keyof typeof comp];
            if (val !== null && val > 0) {
              suma += val;
              count++;
            }
          });
          mPromedios[p] = count > 0 ? Math.round(suma / count) : null;
        });

        // Calcular promedio general de la materia (promedio de los promedios de periodos)
        let promedioMateria = null;
        let sumaP = 0,
          countP = 0;
        ['p1', 'p2', 'p3', 'p4'].forEach((p) => {
          const valP = Math.max(mPromedios[p] || 0, mPromedios[`r${p}`] || 0);
          if (valP > 0) {
            sumaP += valP;
            countP++;
          }
        });
        if (countP > 0) promedioMateria = Math.round((sumaP / countP) * 10) / 10;

        const rasMap: { [key: string]: number } = {};
        tecnicas.forEach((t) => {
          rasMap[t.ra_codigo] = t.valor;
        });

        const claseFinal =
          claseEstudiante || claseNivelMateria || (general ? claseById.get(general.claseId) : null);

        califsEst[materia.id] = {
          p1: mPromedios.p1,
          p2: mPromedios.p2,
          p3: mPromedios.p3,
          p4: numeroPeriodos === 4 ? mPromedios.p4 : null,
          rp1: mPromedios.rp1,
          rp2: mPromedios.rp2,
          rp3: mPromedios.rp3,
          rp4: numeroPeriodos === 4 ? mPromedios.rp4 : null,
          promedio: promedioMateria,
          cpc30: general?.cpc_30 ?? null,
          cpcNota: general?.cpc_nota ?? null,
          cpcTotal: general?.cpc_total ?? null,
          cc: general?.cpc_total ?? null,
          cpex30: general?.cpex_70 ? (promedioMateria ?? 0) * 0.3 : null,
          cpexNota: general?.cpex_nota ?? null,
          cpex70: general?.cpex_70 ?? null,
          cex: general?.cpex_total ?? null,
          promedioFinal: general?.promedioFinal ?? null,
          situacion: general?.situacion ?? null,
          competencias: competenciasMap,
          ras: rasMap,
          claseId: claseFinal?.id || null,
          docenteId: claseFinal?.docente?.id || null,
          docenteNombre: claseFinal?.docente
            ? `${claseFinal.docente.nombre} ${claseFinal.docente.apellido}`
            : null,
          publicado: general?.publicado ?? false,
          observaciones: general?.observaciones ?? null,
        };
      }

      return {
        id: est.id,
        nombre: est.nombre,
        segundoNombre: est.segundoNombre,
        apellido: est.apellido,
        segundoApellido: est.segundoApellido,
        fotoUrl: est.fotoUrl,
        calificaciones: califsEst,
      };
    });

  const result: SabanaData = {
    nivel: { id: nivel.id, nombre: nivel.nombre, gradoNumero: nivel.gradoNumero },
    cicloLectivo: { id: cicloLectivo.id, nombre: cicloLectivo.nombre },
    formatoSabana,
    numeroPeriodos,
    materias,
    estudiantes,
    metadatos: {
      totalEstudiantes: estudiantes.length,
      totalMaterias: materias.length,
      fechaGeneracion: new Date().toISOString(),
      pais: nivel.institucion.pais,
    },
  };

  // Cache: guardar en Redis (1 hora)
  try {
    await redis.setex(cacheKey, SABANA_CACHE_TTL, JSON.stringify(result));
  } catch (err) {
    logger.error({ err }, 'Error guardando caché de sábana');
  }

  return result;
};

/**
 * Obtiene la lista de niveles disponibles para la sábana de notas
 */
export const getNivelesParaSabana = async (
  institucionId: string,
  userId?: string,
  userRole?: string,
) => {
  const where: Record<string, unknown> = { institucionId };
  if (userRole === 'DOCENTE' && userId) {
    where.clases = { some: { docenteId: userId } };
  }
  if (userRole === 'COORDINADOR' && userId) {
    const nivelIds = await getCoordinadorNivelIds(userId);
    where.id = { in: nivelIds };
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
    select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, activo: true },
  });
};
