import prisma from '../../config/db';
import { EstadoTarea, EstadoEntrega } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { sanitizeOptional } from '../../utils/sanitize';

// Interfaces
interface EntregarTareaInput {
  contenido?: string;
  comentarioEstudiante?: string;
  archivos?: { nombre: string; url: string; tipo: string }[];
}

interface CalificarEntregaInput {
  calificacion: number;
  comentarioDocente?: string;
}

// Entregar tarea (estudiante)
export const entregarTarea = async (
  tareaId: string,
  input: EntregarTareaInput,
  estudianteId: string,
  institucionId: string,
) => {
  const tarea = await prisma.tarea.findFirst({
    where: { id: tareaId },
    include: { clase: true },
  });

  if (!tarea) {
    throw new NotFoundError('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new ForbiddenError('No autorizado');
  }

  if (tarea.estado !== EstadoTarea.PUBLICADA) {
    throw new ValidationError('Esta tarea no acepta entregas');
  }

  // Verificar inscripción
  const inscripcion = await prisma.inscripcion.findUnique({
    where: {
      estudianteId_claseId: {
        estudianteId,
        claseId: tarea.claseId,
      },
    },
  });

  if (!inscripcion) {
    throw new ForbiddenError('No estás inscrito en esta clase');
  }

  // Determinar estado (a tiempo o atrasado)
  const ahora = new Date();
  const esAtrasado = ahora > tarea.fechaVencimiento;
  const estado = esAtrasado ? EstadoEntrega.ATRASADO : EstadoEntrega.ENTREGADO;

  // Crear o actualizar entrega
  const entregaExistente = await prisma.entregaTarea.findUnique({
    where: {
      tareaId_estudianteId: {
        tareaId,
        estudianteId,
      },
    },
  });

  if (entregaExistente) {
    // Actualizar entrega existente
    const entrega = await prisma.entregaTarea.update({
      where: { id: entregaExistente.id },
      data: {
        contenido: sanitizeOptional(input.contenido),
        comentarioEstudiante: sanitizeOptional(input.comentarioEstudiante),
        estado,
        fechaEntrega: ahora,
      },
      include: { archivos: true },
    });

    // Agregar archivos si hay
    if (input.archivos && input.archivos.length > 0) {
      await prisma.archivoEntrega.createMany({
        data: input.archivos.map((archivo) => ({
          nombre: archivo.nombre,
          url: archivo.url,
          tipo: archivo.tipo,
          entregaId: entrega.id,
        })),
      });
    }

    return prisma.entregaTarea.findUnique({
      where: { id: entrega.id },
      include: { archivos: true },
    });
  } else {
    // Crear nueva entrega
    return prisma.entregaTarea.create({
      data: {
        contenido: sanitizeOptional(input.contenido),
        comentarioEstudiante: sanitizeOptional(input.comentarioEstudiante),
        estado,
        fechaEntrega: ahora,
        tareaId,
        estudianteId,
        archivos: input.archivos
          ? {
              create: input.archivos.map((archivo) => ({
                nombre: archivo.nombre,
                url: archivo.url,
                tipo: archivo.tipo,
              })),
            }
          : undefined,
      },
      include: { archivos: true },
    });
  }
};

// Calificar entrega (docente)
export const calificarEntrega = async (
  entregaId: string,
  input: CalificarEntregaInput,
  docenteId: string,
  institucionId: string,
) => {
  const entrega = await prisma.entregaTarea.findFirst({
    where: { id: entregaId },
    include: {
      tarea: { include: { clase: true } },
    },
  });

  if (!entrega) {
    throw new NotFoundError('Entrega no encontrada');
  }

  if (entrega.tarea.clase.institucionId !== institucionId) {
    throw new ForbiddenError('No autorizado');
  }

  if (entrega.tarea.docenteId !== docenteId) {
    throw new ForbiddenError('Solo el docente de la tarea puede calificar');
  }

  // Validar calificación
  if (entrega.tarea.puntajeMaximo && input.calificacion > entrega.tarea.puntajeMaximo) {
    throw new ValidationError(`La calificación no puede superar ${entrega.tarea.puntajeMaximo}`);
  }

  if (input.calificacion < 0) {
    throw new ValidationError('La calificación no puede ser negativa');
  }

  return prisma.entregaTarea.update({
    where: { id: entregaId },
    data: {
      calificacion: input.calificacion,
      comentarioDocente: sanitizeOptional(input.comentarioDocente),
      estado: EstadoEntrega.CALIFICADO,
    },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true } },
      archivos: true,
    },
  });
};

// Obtener entregas de una tarea
export const getEntregasTarea = async (
  tareaId: string,
  docenteId: string,
  institucionId: string,
) => {
  const tarea = await prisma.tarea.findFirst({
    where: { id: tareaId },
    include: { clase: true },
  });

  if (!tarea) {
    throw new NotFoundError('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new ForbiddenError('No autorizado');
  }

  if (tarea.docenteId !== docenteId) {
    throw new ForbiddenError('Solo el docente puede ver las entregas');
  }

  // Obtener todos los estudiantes inscritos
  const inscripciones = await prisma.inscripcion.findMany({
    where: { claseId: tarea.claseId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
    },
  });

  // Obtener entregas existentes
  const entregas = await prisma.entregaTarea.findMany({
    where: { tareaId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
      archivos: true,
    },
  });

  // Crear mapa de entregas
  const entregasMap = new Map(entregas.map((e) => [e.estudianteId, e]));

  // Combinar estudiantes con sus entregas
  return inscripciones.map((inscripcion) => ({
    estudiante: inscripcion.estudiante,
    entrega: entregasMap.get(inscripcion.estudianteId) || null,
  }));
};
