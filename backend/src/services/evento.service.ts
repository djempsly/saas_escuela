import prisma from '../config/db';
import { TipoEvento } from '@prisma/client';

// Interfaces
interface CrearEventoInput {
  titulo: string;
  descripcion?: string;
  ubicacion?: string;
  tipo: TipoEvento;
  fechaInicio: Date;
  fechaFin: Date;
  todoElDia?: boolean;
  color?: string;
  claseId?: string;
}

// Crear evento
export const crearEvento = async (
  input: CrearEventoInput,
  creadorId: string,
  institucionId: string
) => {
  // Si hay claseId, verificar que pertenece a la institución
  if (input.claseId) {
    const clase = await prisma.clase.findFirst({
      where: { id: input.claseId, institucionId },
    });

    if (!clase) {
      throw new Error('Clase no encontrada');
    }
  }

  return prisma.evento.create({
    data: {
      titulo: input.titulo,
      descripcion: input.descripcion,
      ubicacion: input.ubicacion,
      tipo: input.tipo,
      fechaInicio: new Date(input.fechaInicio),
      fechaFin: new Date(input.fechaFin),
      todoElDia: input.todoElDia || false,
      color: input.color,
      claseId: input.claseId,
      creadorId,
      institucionId,
    },
    include: {
      creador: { select: { id: true, nombre: true, apellido: true } },
      clase: { include: { materia: true, nivel: true } },
    },
  });
};

// Actualizar evento
export const actualizarEvento = async (
  eventoId: string,
  input: Partial<CrearEventoInput>,
  usuarioId: string,
  role: string,
  institucionId: string
) => {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, institucionId },
  });

  if (!evento) {
    throw new Error('Evento no encontrado');
  }

  // Solo el creador o DIRECTOR pueden editar
  if (evento.creadorId !== usuarioId && role !== 'DIRECTOR') {
    throw new Error('No autorizado para editar este evento');
  }

  // Si se cambia la clase, verificar que pertenece a la institución
  if (input.claseId) {
    const clase = await prisma.clase.findFirst({
      where: { id: input.claseId, institucionId },
    });

    if (!clase) {
      throw new Error('Clase no encontrada');
    }
  }

  return prisma.evento.update({
    where: { id: eventoId },
    data: {
      titulo: input.titulo,
      descripcion: input.descripcion,
      ubicacion: input.ubicacion,
      tipo: input.tipo,
      fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : undefined,
      fechaFin: input.fechaFin ? new Date(input.fechaFin) : undefined,
      todoElDia: input.todoElDia,
      color: input.color,
      claseId: input.claseId,
    },
    include: {
      creador: { select: { id: true, nombre: true, apellido: true } },
      clase: { include: { materia: true, nivel: true } },
    },
  });
};

// Eliminar evento
export const eliminarEvento = async (
  eventoId: string,
  usuarioId: string,
  role: string,
  institucionId: string
) => {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, institucionId },
  });

  if (!evento) {
    throw new Error('Evento no encontrado');
  }

  // Solo el creador o DIRECTOR pueden eliminar
  if (evento.creadorId !== usuarioId && role !== 'DIRECTOR') {
    throw new Error('No autorizado para eliminar este evento');
  }

  return prisma.evento.delete({ where: { id: eventoId } });
};

// Obtener eventos (calendario)
export const getEventos = async (
  usuarioId: string,
  role: string,
  institucionId: string,
  fechaInicio?: Date,
  fechaFin?: Date,
  claseId?: string
) => {
  const where: any = { institucionId };

  // Filtrar por fechas si se proporcionan
  if (fechaInicio && fechaFin) {
    where.OR = [
      {
        fechaInicio: { gte: fechaInicio, lte: fechaFin },
      },
      {
        fechaFin: { gte: fechaInicio, lte: fechaFin },
      },
      {
        AND: [
          { fechaInicio: { lte: fechaInicio } },
          { fechaFin: { gte: fechaFin } },
        ],
      },
    ];
  }

  // Filtrar por clase si se proporciona
  if (claseId) {
    where.claseId = claseId;
  }

  // Para estudiantes, filtrar solo eventos de sus clases o eventos generales
  if (role === 'ESTUDIANTE') {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { estudianteId: usuarioId },
      select: { claseId: true },
    });

    const claseIds = inscripciones.map((i) => i.claseId);

    where.OR = where.OR || [];
    where.AND = [
      {
        OR: [
          { claseId: null }, // Eventos generales
          { claseId: { in: claseIds } }, // Eventos de sus clases
        ],
      },
    ];

    if (fechaInicio && fechaFin) {
      where.AND.push({
        OR: [
          { fechaInicio: { gte: fechaInicio, lte: fechaFin } },
          { fechaFin: { gte: fechaInicio, lte: fechaFin } },
          {
            AND: [
              { fechaInicio: { lte: fechaInicio } },
              { fechaFin: { gte: fechaFin } },
            ],
          },
        ],
      });
    }

    delete where.OR;
  }

  // Para docentes, filtrar eventos de sus clases o eventos generales
  if (role === 'DOCENTE') {
    const clases = await prisma.clase.findMany({
      where: { docenteId: usuarioId },
      select: { id: true },
    });

    const claseIds = clases.map((c) => c.id);

    if (!claseId) {
      where.OR = [
        { claseId: null }, // Eventos generales
        { claseId: { in: claseIds } }, // Eventos de sus clases
        { creadorId: usuarioId }, // Eventos que creó
      ];
    }
  }

  return prisma.evento.findMany({
    where,
    include: {
      creador: { select: { id: true, nombre: true, apellido: true } },
      clase: { include: { materia: true, nivel: true } },
    },
    orderBy: { fechaInicio: 'asc' },
  });
};

// Obtener evento por ID
export const getEventoById = async (
  eventoId: string,
  usuarioId: string,
  role: string,
  institucionId: string
) => {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, institucionId },
    include: {
      creador: { select: { id: true, nombre: true, apellido: true } },
      clase: { include: { materia: true, nivel: true } },
    },
  });

  if (!evento) {
    throw new Error('Evento no encontrado');
  }

  // Verificar acceso para estudiantes
  if (role === 'ESTUDIANTE' && evento.claseId) {
    const inscripcion = await prisma.inscripcion.findUnique({
      where: {
        estudianteId_claseId: {
          estudianteId: usuarioId,
          claseId: evento.claseId,
        },
      },
    });

    if (!inscripcion) {
      throw new Error('No tienes acceso a este evento');
    }
  }

  // Verificar acceso para docentes
  if (role === 'DOCENTE' && evento.claseId) {
    const clase = await prisma.clase.findFirst({
      where: { id: evento.claseId, docenteId: usuarioId },
    });

    if (!clase && evento.creadorId !== usuarioId) {
      throw new Error('No tienes acceso a este evento');
    }
  }

  return evento;
};

// Obtener tipos de evento disponibles
export const getTiposEvento = () => {
  return Object.values(TipoEvento);
};
