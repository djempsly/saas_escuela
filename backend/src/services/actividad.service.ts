import prisma from '../config/db';
import { deleteFile } from '../middleware/upload.middleware';

interface ActividadInput {
  titulo: string;
  contenido: string;
  urlImagen?: string;
  urlVideo?: string;
}

// Crear actividad (Solo ADMIN)
export const createActividad = async (input: ActividadInput, autorId: string) => {
  return prisma.actividad.create({
    data: {
      titulo: input.titulo,
      contenido: input.contenido,
      urlArchivo: input.urlImagen || input.urlVideo || null,
      autorId,
    },
    include: {
      autor: { select: { id: true, nombre: true, apellido: true } },
    },
  });
};

// Obtener todas las actividades (públicas - para landing)
export const findAllActividades = async (limit?: number) => {
  return prisma.actividad.findMany({
    include: {
      autor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 50,
  });
};

// Obtener actividad por ID
export const findActividadById = async (id: string) => {
  return prisma.actividad.findUnique({
    where: { id },
    include: {
      autor: { select: { id: true, nombre: true, apellido: true } },
    },
  });
};

// Actualizar actividad (Solo ADMIN)
export const updateActividad = async (id: string, input: Partial<ActividadInput>) => {
  const existing = await prisma.actividad.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Actividad no encontrada');
  }

  // Si se está actualizando el archivo y había uno anterior, eliminarlo
  if ((input.urlImagen || input.urlVideo) && existing.urlArchivo) {
    deleteFile(existing.urlArchivo);
  }

  return prisma.actividad.update({
    where: { id },
    data: {
      titulo: input.titulo,
      contenido: input.contenido,
      urlArchivo: input.urlImagen || input.urlVideo || existing.urlArchivo,
    },
    include: {
      autor: { select: { id: true, nombre: true, apellido: true } },
    },
  });
};

// Eliminar actividad (Solo ADMIN)
export const deleteActividad = async (id: string) => {
  const actividad = await prisma.actividad.findUnique({
    where: { id },
  });

  if (!actividad) {
    throw new Error('Actividad no encontrada');
  }

  // Eliminar archivo asociado si existe
  if (actividad.urlArchivo) {
    deleteFile(actividad.urlArchivo);
  }

  return prisma.actividad.delete({
    where: { id },
  });
};

// Buscar actividades por título
export const searchActividades = async (query: string, limit?: number) => {
  return prisma.actividad.findMany({
    where: {
      OR: [
        { titulo: { contains: query, mode: 'insensitive' } },
        { contenido: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      autor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 20,
  });
};
