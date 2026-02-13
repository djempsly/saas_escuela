/**
 * Servicio de Datos para Boletines
 * Retorna datos estructurados para cualquier plantilla de boletín
 */

import prisma from '../../config/db';
import { logger } from '../../config/logger';
import { NotFoundError, ValidationError } from '../../errors';
import type {
  BoletinDataResponse,
  CalificacionMateria,
  Competencia,
  ModuloTecnico,
} from './types';

/**
 * Obtiene los datos estructurados para generar un boletín
 */
export async function getBoletinData(
  estudianteId: string,
  cicloId: string,
  institucionId: string,
): Promise<BoletinDataResponse> {
  // Obtener estudiante con su institución
  const estudiante = await prisma.user.findFirst({
    where: {
      id: estudianteId,
      institucionId,
      role: 'ESTUDIANTE',
    },
    include: {
      institucion: true,
      inscripciones: {
        where: { activa: true },
        include: {
          clase: {
            include: {
              nivel: true,
              materia: true,
            },
          },
        },
        orderBy: { fecha: 'desc' },
        take: 1,
      },
    },
  });

  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado');
  }

  if (!estudiante.institucion) {
    throw new ValidationError('Estudiante sin institución asignada');
  }

  // Obtener ciclo lectivo
  const ciclo = await prisma.cicloLectivo.findFirst({
    where: {
      id: cicloId,
      institucionId,
    },
  });

  if (!ciclo) {
    throw new NotFoundError('Ciclo lectivo no encontrado');
  }

  // Obtener calificaciones del estudiante
  const calificacionesDB = await prisma.calificacion.findMany({
    where: {
      estudianteId,
      cicloLectivoId: cicloId,
    },
    include: {
      clase: {
        include: {
          materia: true,
          nivel: true,
        },
      },
    },
    orderBy: {
      clase: {
        materia: { nombre: 'asc' },
      },
    },
  });

  // Obtener calificaciones técnicas (solo para politécnicos)
  let calificacionesTecnicasDB: { valor: number; ra_codigo: string; clase: { materia: { nombre: string } | null } }[] = [];
  if (estudiante.institucion.sistema === 'POLITECNICO_DO') {
    calificacionesTecnicasDB = await prisma.calificacionTecnica.findMany({
      where: {
        estudianteId,
      },
      include: {
        clase: {
          include: {
            materia: true,
          },
        },
      },
    });
  }

  // Obtener asistencias del estudiante en el ciclo
  const asistenciasDB = await prisma.asistencia.findMany({
    where: {
      estudianteId,
      clase: {
        cicloLectivoId: cicloId,
      },
    },
  });

  // Calcular resumen de asistencia
  const totalDias = asistenciasDB.length;
  const diasPresente = asistenciasDB.filter((a) => a.estado === 'PRESENTE').length;
  const diasAusente = asistenciasDB.filter((a) => a.estado === 'AUSENTE').length;
  const diasTarde = asistenciasDB.filter((a) => a.estado === 'TARDE').length;
  const porcentajeAnual = totalDias > 0 ? (diasPresente / totalDias) * 100 : 0;

  // Obtener información del nivel/grado
  const inscripcion = estudiante.inscripciones[0];
  const nivel = inscripcion?.clase?.nivel;

  // Mapear calificaciones al formato del boletín
  const calificaciones: CalificacionMateria[] = calificacionesDB.map((cal) => ({
    materiaId: cal.clase.materiaId,
    materia: cal.clase.materia?.nombre || 'Sin nombre',
    tipo: cal.clase.materia?.tipo === 'TECNICA' ? 'TECNICA' : 'GENERAL',
    periodos: [
      { periodo: 'P1' as const, nota: cal.p1, recuperacion: cal.rp1 },
      { periodo: 'P2' as const, nota: cal.p2, recuperacion: cal.rp2 },
      { periodo: 'P3' as const, nota: cal.p3, recuperacion: cal.rp3 },
      { periodo: 'P4' as const, nota: cal.p4, recuperacion: cal.rp4 },
    ],
    promedioFinal: cal.promedioFinal || 0,
    estado: cal.situacion || 'PENDIENTE',
  }));

  // Generar competencias para politécnico (simulación - deberían venir de la base de datos)
  let competencias: Competencia[] | undefined;
  let modulosTecnicos: ModuloTecnico[] | undefined;

  if (estudiante.institucion.sistema === 'POLITECNICO_DO') {
    // Competencias fundamentales del MINERD para politécnico
    const competenciasFundamentales = [
      { codigo: 'CCL', nombre: 'Competencia Comunicativa Lingüística' },
      { codigo: 'CM', nombre: 'Competencia Matemática' },
      { codigo: 'CCTN', nombre: 'Competencia Científica, Tecnológica y Ambiental' },
      { codigo: 'CSH', nombre: 'Competencia Social y Humanística' },
      { codigo: 'CAE', nombre: 'Competencia Artística y Estética' },
      { codigo: 'CDM', nombre: 'Competencia Desarrollo Motor' },
      { codigo: 'CEP', nombre: 'Competencia Ética y Práctica' },
    ];

    // Agrupar calificaciones por competencia (promedio de materias relacionadas)
    competencias = competenciasFundamentales.map((comp, index) => {
      // Tomar las calificaciones disponibles para simular competencias
      const calMateria = calificacionesDB[index % calificacionesDB.length];
      return {
        codigo: comp.codigo,
        nombre: comp.nombre,
        tipo: 'FUNDAMENTAL' as const,
        calificaciones: {
          p1: calMateria?.p1 || undefined,
          p2: calMateria?.p2 || undefined,
          p3: calMateria?.p3 || undefined,
          p4: calMateria?.p4 || undefined,
          rp1: calMateria?.rp1 || undefined,
          rp2: calMateria?.rp2 || undefined,
          rp3: calMateria?.rp3 || undefined,
          rp4: calMateria?.rp4 || undefined,
        },
        promedio: calMateria?.promedioFinal || 0,
      };
    });

    // Procesar módulos técnicos (agrupar por materia técnica)
    const materiasTecnicas = [
      ...new Set(calificacionesTecnicasDB.map((ct) => ct.clase.materia?.nombre).filter(Boolean)),
    ];

    modulosTecnicos = materiasTecnicas.map((materiaNombre, idx) => {
      const ras = calificacionesTecnicasDB
        .filter((ct) => ct.clase.materia?.nombre === materiaNombre)
        .map((ct) => {
          const promedio = ct.valor || 0;
          let estado: 'LOGRADO' | 'EN_PROCESO' | 'NO_LOGRADO' = 'NO_LOGRADO';
          if (promedio >= 70) estado = 'LOGRADO';
          else if (promedio >= 50) estado = 'EN_PROCESO';

          return {
            codigo: ct.ra_codigo,
            descripcion: `Resultado de aprendizaje ${ct.ra_codigo}`,
            calificaciones: {
              p1: ct.valor,
              p2: undefined,
              p3: undefined,
              p4: undefined,
            },
            estado,
          };
        });

      return {
        codigo: `MT${idx + 1}`,
        nombre: materiaNombre as string,
        resultadosAprendizaje: ras,
      };
    });
  }

  // Determinar situación final
  let situacionFinal = 'EN_PROCESO';
  if (calificaciones.length > 0) {
    const promedioGeneral =
      calificaciones.reduce((sum, c) => sum + c.promedioFinal, 0) / calificaciones.length;
    const todasAprobadas = calificaciones.every((c) => c.promedioFinal >= 70);

    if (todasAprobadas && promedioGeneral >= 70 && porcentajeAnual >= 80) {
      situacionFinal = 'PROMOVIDO';
    } else if (promedioGeneral < 65) {
      situacionFinal = 'REPROBADO';
    } else {
      situacionFinal = 'APLAZANTE';
    }
  }

  // Construir respuesta
  const response: BoletinDataResponse = {
    estudiante: {
      id: estudiante.id,
      nombre: estudiante.nombre,
      apellido: estudiante.apellido,
      matricula: estudiante.username,
      grado: nivel?.nombre || 'Sin grado',
      seccion: inscripcion?.clase?.codigo?.slice(-2) || 'A',
      foto: estudiante.fotoUrl || undefined,
    },
    institucion: {
      id: estudiante.institucion.id,
      nombre: estudiante.institucion.nombre,
      logoUrl: estudiante.institucion.logoUrl || undefined,
      direccion: estudiante.institucion.direccion || undefined,
      codigoCentro: estudiante.institucion.codigoCentro || undefined,
      sistemaEducativo: estudiante.institucion.sistema,
      colorPrimario: estudiante.institucion.colorPrimario,
      colorSecundario: estudiante.institucion.colorSecundario || undefined,
      pais: estudiante.institucion.pais,
    },
    ciclo: {
      id: ciclo.id,
      nombre: ciclo.nombre,
      fechaInicio: ciclo.fechaInicio.toISOString().split('T')[0],
      fechaFin: ciclo.fechaFin.toISOString().split('T')[0],
      añoEscolar: ciclo.nombre,
    },
    calificaciones,
    competencias,
    modulosTecnicos,
    asistencia: {
      totalDias,
      diasPresente,
      diasAusente,
      diasTarde,
      porcentajeAnual,
    },
    situacionFinal,
    fechaEmision: new Date().toISOString().split('T')[0],
  };

  return response;
}

/**
 * Obtener boletines para todos los estudiantes de una clase
 */
export async function getBoletinesClase(
  claseId: string,
  cicloId: string,
  institucionId: string,
): Promise<BoletinDataResponse[]> {
  // Obtener inscripciones activas de la clase
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      claseId,
      activa: true,
      clase: {
        institucionId,
        cicloLectivoId: cicloId,
      },
    },
    include: {
      estudiante: true,
    },
  });

  // Generar boletín para cada estudiante
  const boletines: BoletinDataResponse[] = [];
  for (const inscripcion of inscripciones) {
    try {
      const boletin = await getBoletinData(inscripcion.estudianteId, cicloId, institucionId);
      boletines.push(boletin);
    } catch (error) {
      logger.error(
        { err: error, estudianteId: inscripcion.estudianteId },
        'Error generando boletín para estudiante',
      );
    }
  }

  return boletines;
}
