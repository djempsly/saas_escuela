/**
 * Servicio para Sábana de Notas — Actualización y publicación
 */

import prisma from '../../config/db';
import { logger } from '../../config/logger';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { sanitizeOptional } from '../../utils/sanitize';
import { crearNotificacionesMasivas } from '../notificacion.service';
import { emitirNotificacionMasiva } from '../socket-emitter.service';
import { invalidarCacheSabana } from './query.service';
import { verificarCicloNoCerrado } from '../cycle.service';

/**
 * Actualiza calificación
 * Soporta actualización de notas generales (P1-P4) y técnicas (RA)
 */
export const updateCalificacionSabana = async (
  claseId: string,
  estudianteId: string,
  periodo: string, // 'p1'...'p4', 'RA1'...'RA10', 'observaciones'
  valor: number | null,
  userId: string,
  userRole: string,
  userInstitucionId: string,
  competenciaId?: string,
  valorTexto?: string,
) => {
  const clase = await prisma.clase.findUnique({
    where: { id: claseId },
    select: {
      id: true,
      docenteId: true,
      nivelId: true,
      cicloLectivoId: true,
      nivel: { select: { institucionId: true } },
      cicloLectivo: { select: { activo: true, cerrado: true } },
    },
  });

  if (!clase) throw new NotFoundError('Clase no encontrada');
  if (clase.nivel.institucionId !== userInstitucionId) throw new ForbiddenError('Sin permiso');

  // Bloquear edición si el ciclo no está activo
  if (!clase.cicloLectivo.activo) {
    throw new ValidationError('No se pueden editar calificaciones de un ciclo lectivo inactivo');
  }
  verificarCicloNoCerrado(clase.cicloLectivo);

  const esDocente = clase.docenteId === userId;
  const esDirector = userRole === 'DIRECTOR';
  if (!esDocente && !esDirector) throw new ForbiddenError('Sin permiso para editar');

  // Invalidar caché antes de escribir
  await invalidarCacheSabana(clase.nivelId, clase.cicloLectivoId);

  // Guardar observaciones (texto, no numérico)
  if (periodo === 'observaciones') {
    const calExistente = await prisma.calificacion.findUnique({
      where: {
        estudianteId_claseId_cicloLectivoId: {
          estudianteId,
          claseId,
          cicloLectivoId: clase.cicloLectivoId,
        },
      },
    });

    if (calExistente) {
      return prisma.calificacion.update({
        where: { id: calExistente.id },
        data: { observaciones: sanitizeOptional(valorTexto) || null },
      });
    } else {
      return prisma.calificacion.create({
        data: {
          estudianteId,
          claseId,
          cicloLectivoId: clase.cicloLectivoId,
          observaciones: sanitizeOptional(valorTexto) || null,
        },
      });
    }
  }

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
          ra_codigo: raCodigo,
        },
      });
      return { status: 'deleted' };
    }

    // Upsert
    return prisma.calificacionTecnica.upsert({
      where: {
        estudianteId_claseId_ra_codigo: {
          estudianteId,
          claseId,
          ra_codigo: raCodigo,
        },
      },
      update: { valor },
      create: {
        estudianteId,
        claseId,
        ra_codigo: raCodigo,
        valor,
      },
    });
  } else if (
    competenciaId &&
    !['cpc_nota', 'cpex_nota', 'cpc_30', 'cpex_70'].includes(periodo.toLowerCase())
  ) {
    // NUEVO: Actualizar Calificación por Competencia
    const calificacionExistente = await prisma.calificacionCompetencia.findUnique({
      where: {
        estudianteId_claseId_cicloLectivoId_competencia: {
          estudianteId,
          claseId,
          cicloLectivoId: clase.cicloLectivoId,
          competencia: competenciaId,
        },
      },
    });

    if (calificacionExistente) {
      return prisma.calificacionCompetencia.update({
        where: { id: calificacionExistente.id },
        data: { [periodo.toLowerCase()]: valor },
      });
    } else {
      return prisma.calificacionCompetencia.create({
        data: {
          estudianteId,
          claseId,
          cicloLectivoId: clase.cicloLectivoId,
          competencia: competenciaId,
          [periodo.toLowerCase()]: valor,
        },
      });
    }
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

/**
 * Publicar calificaciones de una clase para un ciclo lectivo
 */
export const publicarCalificaciones = async (
  claseId: string,
  cicloLectivoId: string,
  userId: string,
  userRole: string,
  institucionId: string,
) => {
  // Verificar la clase
  const clase = await prisma.clase.findUnique({
    where: { id: claseId },
    select: {
      id: true,
      docenteId: true,
      nivelId: true,
      cicloLectivoId: true,
      materia: { select: { nombre: true } },
      nivel: { select: { institucionId: true } },
      cicloLectivo: { select: { cerrado: true } },
    },
  });

  if (!clase) throw new NotFoundError('Clase no encontrada');
  if (clase.nivel.institucionId !== institucionId) throw new ForbiddenError('Sin permiso');

  // Verificar permisos: docente de la clase, coordinador, o director
  const esDocente = clase.docenteId === userId;
  const esDirector = userRole === 'DIRECTOR';
  const esCoordinador = userRole === 'COORDINADOR' || userRole === 'COORDINADOR_ACADEMICO';

  if (!esDocente && !esDirector && !esCoordinador) {
    throw new ForbiddenError('Sin permiso para publicar calificaciones');
  }

  verificarCicloNoCerrado(clase.cicloLectivo);

  // Invalidar caché al publicar
  await invalidarCacheSabana(clase.nivelId, cicloLectivoId);

  const now = new Date();

  // Actualizar calificaciones generales
  const calificacionesUpdate = await prisma.calificacion.updateMany({
    where: {
      claseId,
      cicloLectivoId,
      publicado: false,
    },
    data: {
      publicado: true,
      publicadoAt: now,
      publicadoPor: userId,
    },
  });

  // Actualizar calificaciones por competencia
  const competenciasUpdate = await prisma.calificacionCompetencia.updateMany({
    where: {
      claseId,
      cicloLectivoId,
      publicado: false,
    },
    data: {
      publicado: true,
      publicadoAt: now,
      publicadoPor: userId,
    },
  });

  // Crear notificaciones para estudiantes si hubo calificaciones publicadas
  const totalPublicadas = calificacionesUpdate.count + competenciasUpdate.count;
  if (totalPublicadas > 0) {
    try {
      const inscripciones = await prisma.inscripcion.findMany({
        where: { claseId, activa: true },
        select: { estudianteId: true },
      });

      const estudianteUserIds = await prisma.user.findMany({
        where: { id: { in: inscripciones.map((i) => i.estudianteId) } },
        select: { id: true },
      });

      const materiaNombre = clase.materia?.nombre || 'tu clase';
      const userIds = estudianteUserIds.map((u) => u.id);
      await crearNotificacionesMasivas(
        userIds,
        'Calificaciones Publicadas',
        `Se han publicado nuevas calificaciones en ${materiaNombre}. Revisa tu boletín.`,
      );

      // Emitir notificación en tiempo real via socket
      emitirNotificacionMasiva(userIds, {
        tipo: 'calificaciones_publicadas',
        titulo: 'Calificaciones Publicadas',
        mensaje: `Se han publicado nuevas calificaciones en ${materiaNombre}. Revisa tu boletín.`,
        data: { claseId, cicloLectivoId },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      // No falla la publicación si las notificaciones fallan
      logger.error({ err }, 'Error creando notificaciones');
    }
  }

  return {
    calificacionesPublicadas: calificacionesUpdate.count,
    competenciasPublicadas: competenciasUpdate.count,
    claseId,
    cicloLectivoId,
    publicadoAt: now,
  };
};
