import prisma from '../../config/db';
import { EstadoTarea, TipoRecurso } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { sanitizeText, sanitizeOptional } from '../../utils/sanitize';

// Interfaces
interface CrearTareaInput {
  titulo: string;
  descripcion: string;
  instrucciones?: string;
  fechaPublicacion?: Date;
  fechaVencimiento: Date;
  puntajeMaximo?: number;
  estado?: EstadoTarea;
  claseId: string;
}

interface RecursoInput {
  tipo: TipoRecurso;
  titulo: string;
  url: string;
}

// Validar acceso a clase
const validarAccesoClase = async (claseId: string, institucionId: string) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    include: {
      materia: true,
      docente: { select: { id: true, nombre: true, apellido: true } },
    },
  });

  if (!clase) {
    throw new NotFoundError('Clase no encontrada');
  }

  return clase;
};

// Crear tarea
export const crearTarea = async (
  input: CrearTareaInput,
  docenteId: string,
  institucionId: string,
) => {
  const clase = await validarAccesoClase(input.claseId, institucionId);

  // Verificar que el usuario es el docente de la clase
  if (clase.docenteId !== docenteId) {
    throw new ForbiddenError('Solo el docente de la clase puede crear tareas');
  }

  return prisma.tarea.create({
    data: {
      titulo: sanitizeText(input.titulo),
      descripcion: sanitizeText(input.descripcion),
      instrucciones: sanitizeOptional(input.instrucciones),
      fechaPublicacion: input.fechaPublicacion,
      fechaVencimiento: input.fechaVencimiento,
      puntajeMaximo: input.puntajeMaximo,
      estado: input.estado || EstadoTarea.BORRADOR,
      claseId: input.claseId,
      docenteId,
    },
    include: {
      clase: { include: { materia: true, nivel: true } },
      docente: { select: { id: true, nombre: true, apellido: true } },
    },
  });
};

// Actualizar tarea
export const actualizarTarea = async (
  tareaId: string,
  input: Partial<CrearTareaInput>,
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
    throw new ForbiddenError('Solo el docente que creó la tarea puede editarla');
  }

  const sanitizedInput = {
    ...input,
    ...(input.titulo !== undefined && { titulo: sanitizeText(input.titulo) }),
    ...(input.descripcion !== undefined && { descripcion: sanitizeText(input.descripcion) }),
    ...(input.instrucciones !== undefined && {
      instrucciones: sanitizeOptional(input.instrucciones),
    }),
  };

  return prisma.tarea.update({
    where: { id: tareaId },
    data: sanitizedInput,
    include: {
      clase: { include: { materia: true, nivel: true } },
      docente: { select: { id: true, nombre: true, apellido: true } },
      recursos: true,
    },
  });
};

// Eliminar tarea
export const eliminarTarea = async (tareaId: string, docenteId: string, institucionId: string) => {
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
    throw new ForbiddenError('Solo el docente que creó la tarea puede eliminarla');
  }

  // Eliminar recursos, archivos de entregas y entregas primero
  await prisma.recursoTarea.deleteMany({ where: { tareaId } });
  await prisma.archivoEntrega.deleteMany({
    where: { entrega: { tareaId } },
  });
  await prisma.entregaTarea.deleteMany({ where: { tareaId } });

  return prisma.tarea.delete({ where: { id: tareaId } });
};

// Obtener tareas (filtradas por rol)
export const getTareas = async (
  usuarioId: string,
  role: string,
  institucionId: string,
  claseId?: string,
) => {
  if (role === 'DOCENTE') {
    // Docente ve las tareas de sus clases
    const where: any = {
      docenteId: usuarioId,
      clase: { institucionId },
    };
    if (claseId) {
      where.claseId = claseId;
    }

    return prisma.tarea.findMany({
      where,
      include: {
        clase: { include: { materia: true, nivel: true } },
        _count: { select: { entregas: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === 'ESTUDIANTE') {
    // Estudiante ve tareas de clases donde está inscrito
    const inscripciones = await prisma.inscripcion.findMany({
      where: { estudianteId: usuarioId },
      select: { claseId: true },
    });

    const claseIds = inscripciones.map((i) => i.claseId);

    const where: any = {
      claseId: { in: claseIds },
      estado: EstadoTarea.PUBLICADA,
    };
    if (claseId && claseIds.includes(claseId)) {
      where.claseId = claseId;
    }

    return prisma.tarea.findMany({
      where,
      include: {
        clase: { include: { materia: true, nivel: true } },
        docente: { select: { id: true, nombre: true, apellido: true } },
        entregas: {
          where: { estudianteId: usuarioId },
          select: { id: true, estado: true, calificacion: true, fechaEntrega: true },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });
  } else {
    // Otros roles ven todas las tareas de la institución
    const where: any = {
      clase: { institucionId },
    };
    if (claseId) {
      where.claseId = claseId;
    }

    return prisma.tarea.findMany({
      where,
      include: {
        clase: { include: { materia: true, nivel: true } },
        docente: { select: { id: true, nombre: true, apellido: true } },
        _count: { select: { entregas: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
};

// Obtener detalle de tarea
export const getTareaById = async (
  tareaId: string,
  usuarioId: string,
  role: string,
  institucionId: string,
) => {
  const tarea = await prisma.tarea.findFirst({
    where: { id: tareaId },
    include: {
      clase: { include: { materia: true, nivel: true } },
      docente: { select: { id: true, nombre: true, apellido: true } },
      recursos: true,
      entregas:
        role === 'ESTUDIANTE'
          ? {
              where: { estudianteId: usuarioId },
              include: { archivos: true },
            }
          : {
              include: {
                estudiante: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
                archivos: true,
              },
              orderBy: { estudiante: { apellido: 'asc' } },
            },
    },
  });

  if (!tarea) {
    throw new NotFoundError('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new ForbiddenError('No autorizado');
  }

  // Verificar acceso según rol
  if (role === 'ESTUDIANTE') {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: {
        estudianteId_claseId: {
          estudianteId: usuarioId,
          claseId: tarea.claseId,
        },
      },
    });

    if (!inscripcion) {
      throw new ForbiddenError('No estás inscrito en esta clase');
    }

    if (tarea.estado !== EstadoTarea.PUBLICADA) {
      throw new ValidationError('Esta tarea no está disponible');
    }
  }

  return tarea;
};

// Agregar recurso a tarea
export const agregarRecurso = async (
  tareaId: string,
  recurso: RecursoInput,
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
    throw new ForbiddenError('Solo el docente puede agregar recursos');
  }

  return prisma.recursoTarea.create({
    data: {
      tipo: recurso.tipo,
      titulo: sanitizeText(recurso.titulo),
      url: recurso.url,
      tareaId,
    },
  });
};
