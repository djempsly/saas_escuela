import prisma from '../config/db';
import { EstadoTarea, EstadoEntrega, TipoRecurso } from '@prisma/client';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize';

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

interface EntregarTareaInput {
  contenido?: string;
  comentarioEstudiante?: string;
  archivos?: { nombre: string; url: string; tipo: string }[];
}

interface CalificarEntregaInput {
  calificacion: number;
  comentarioDocente?: string;
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
    throw new Error('Clase no encontrada');
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
    throw new Error('Solo el docente de la clase puede crear tareas');
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
    throw new Error('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
  }

  if (tarea.docenteId !== docenteId) {
    throw new Error('Solo el docente que creó la tarea puede editarla');
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
    throw new Error('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
  }

  if (tarea.docenteId !== docenteId) {
    throw new Error('Solo el docente que creó la tarea puede eliminarla');
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
    throw new Error('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
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
      throw new Error('No estás inscrito en esta clase');
    }

    if (tarea.estado !== EstadoTarea.PUBLICADA) {
      throw new Error('Esta tarea no está disponible');
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
    throw new Error('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
  }

  if (tarea.docenteId !== docenteId) {
    throw new Error('Solo el docente puede agregar recursos');
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
    throw new Error('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
  }

  if (tarea.estado !== EstadoTarea.PUBLICADA) {
    throw new Error('Esta tarea no acepta entregas');
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
    throw new Error('No estás inscrito en esta clase');
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
    throw new Error('Entrega no encontrada');
  }

  if (entrega.tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
  }

  if (entrega.tarea.docenteId !== docenteId) {
    throw new Error('Solo el docente de la tarea puede calificar');
  }

  // Validar calificación
  if (entrega.tarea.puntajeMaximo && input.calificacion > entrega.tarea.puntajeMaximo) {
    throw new Error(`La calificación no puede superar ${entrega.tarea.puntajeMaximo}`);
  }

  if (input.calificacion < 0) {
    throw new Error('La calificación no puede ser negativa');
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
    throw new Error('Tarea no encontrada');
  }

  if (tarea.clase.institucionId !== institucionId) {
    throw new Error('No autorizado');
  }

  if (tarea.docenteId !== docenteId) {
    throw new Error('Solo el docente puede ver las entregas');
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
