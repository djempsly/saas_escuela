import prisma from '../../config/db';
import { SistemaEducativo, TipoMateria } from '@prisma/client';
import { ValidationError } from '../../errors';
import { invalidarCacheSabana } from '../sabana';
import { validarAccesoClase, calcularPromedioFinal, CalificacionGeneralInput, CalificacionTecnicaInput } from './calculo';
import { getErrorMessage } from '../../utils/error-helpers';
import { verificarCicloNoCerrado } from '../cycle.service';

// Guardar/Actualizar calificación general
export const guardarCalificacion = async (
  input: CalificacionGeneralInput,
  institucionId: string,
) => {
  const clase = await validarAccesoClase(input.claseId, institucionId);
  verificarCicloNoCerrado(clase.cicloLectivo);

  // Verificar sistema educativo
  const sistema = clase.institucion.sistema;

  // Si es Politécnico y materia técnica, no permitir aquí
  if (sistema === SistemaEducativo.POLITECNICO_DO && clase.materia.tipo === TipoMateria.TECNICA) {
    throw new ValidationError(
      'Para materias técnicas en Politécnico, use el endpoint de calificación técnica (RA)',
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
    throw new ValidationError('Estudiante no inscrito en esta clase');
  }

  // Preparar datos según sistema
  const dataToSave: Record<string, unknown> = {
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
    dataToSave.cpc_nota = input.cpc_nota;
    dataToSave.cpex_70 = input.cpex_70;
    dataToSave.cpex_nota = input.cpex_nota;
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

  const calInclude = {
    estudiante: { select: { id: true, nombre: true, apellido: true } },
    clase: { select: { id: true, codigo: true, materia: { select: { id: true, nombre: true, tipo: true } } } },
  } as const;

  const resultado = existente
    ? await prisma.calificacion.update({
        where: { id: existente.id },
        data: dataToSave,
        include: calInclude,
      })
    : await prisma.calificacion.create({
        data: {
          ...dataToSave,
          estudianteId: input.estudianteId,
          claseId: input.claseId,
          cicloLectivoId: clase.cicloLectivoId,
        },
        include: calInclude,
      });

  await invalidarCacheSabana(clase.nivelId, clase.cicloLectivoId);
  return resultado;
};

// Guardar calificación técnica (RA) - Solo Politécnico
export const guardarCalificacionTecnica = async (
  input: CalificacionTecnicaInput,
  institucionId: string,
) => {
  const clase = await validarAccesoClase(input.claseId, institucionId);
  verificarCicloNoCerrado(clase.cicloLectivo);

  // Verificar que es Politécnico
  if (clase.institucion.sistema !== SistemaEducativo.POLITECNICO_DO) {
    throw new ValidationError('Calificaciones técnicas solo aplican para Politécnicos');
  }

  // Verificar que la materia es técnica
  if (clase.materia.tipo !== TipoMateria.TECNICA) {
    throw new ValidationError('Esta materia no es de tipo técnica. Use calificación general.');
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
    throw new ValidationError('Estudiante no inscrito en esta clase');
  }

  // Validar valor (0-100)
  if (input.valor < 0 || input.valor > 100) {
    throw new ValidationError('El valor debe estar entre 0 y 100');
  }

  // Upsert del RA
  const resultado = await prisma.calificacionTecnica.upsert({
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
      clase: { select: { id: true, codigo: true, materia: { select: { id: true, nombre: true, tipo: true } } } },
    },
  });

  await invalidarCacheSabana(clase.nivelId, clase.cicloLectivoId);
  return resultado;
};

// Obtener calificaciones de una clase (incluye estudiantes inscritos, paginados)
export const getCalificacionesByClase = async (
  claseId: string,
  institucionId: string,
  page: number = 1,
  limit: number = 50,
) => {
  const clase = await validarAccesoClase(claseId, institucionId);
  const safeLimit = Math.min(limit, 200);
  const skip = (page - 1) * safeLimit;

  const inscWhere = { claseId, activa: true };

  // Paginar inscripciones + contar total
  const [inscripciones, totalEstudiantes] = await Promise.all([
    prisma.inscripcion.findMany({
      where: inscWhere,
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
      },
      orderBy: { estudiante: { apellido: 'asc' } },
      skip,
      take: safeLimit,
    }),
    prisma.inscripcion.count({ where: inscWhere }),
  ]);

  // Obtener calificaciones solo para los estudiantes de esta página
  const estudianteIds = inscripciones.map((i) => i.estudianteId);
  const calificacionesExistentes = await prisma.calificacion.findMany({
    where: { claseId, estudianteId: { in: estudianteIds } },
  });

  // Crear mapa de calificaciones por estudianteId
  const calificacionesMap = new Map(calificacionesExistentes.map((c) => [c.estudianteId, c]));

  // Combinar: estudiantes de la página con sus calificaciones (o vacías)
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
  let calificacionesTecnicas: Awaited<ReturnType<typeof prisma.calificacionTecnica.findMany>> = [];
  if (
    clase.institucion.sistema === SistemaEducativo.POLITECNICO_DO &&
    clase.materia.tipo === TipoMateria.TECNICA
  ) {
    calificacionesTecnicas = await prisma.calificacionTecnica.findMany({
      where: { claseId, estudianteId: { in: estudianteIds } },
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
    totalEstudiantes,
    calificacionesTecnicas: calificacionesTecnicas.length > 0 ? calificacionesTecnicas : undefined,
    pagination: {
      page,
      limit: safeLimit,
      total: totalEstudiantes,
      totalPages: Math.ceil(totalEstudiantes / safeLimit),
    },
  };
};

// Guardar calificaciones masivas (para un periodo específico)
export const guardarCalificacionesMasivas = async (
  claseId: string,
  periodo: 'p1' | 'p2' | 'p3' | 'p4',
  calificaciones: { estudianteId: string; nota: number }[],
  institucionId: string,
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
        institucionId,
      );
      resultados.exitosos++;
    } catch (error: unknown) {
      resultados.fallidos.push({ estudianteId: cal.estudianteId, error: getErrorMessage(error) });
    }
  }

  return resultados;
};
