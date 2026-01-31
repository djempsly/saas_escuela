import prisma from '../config/db';
import { deleteFile } from '../middleware/upload.middleware';

interface ActividadInput {
  titulo: string;
  contenido: string;
  urlImagen?: string;
  urlVideo?: string;
  institucionId?: string;
  publicado?: boolean;
}

// Crear actividad (ADMIN o DIRECTOR con autogestion)
export const createActividad = async (
  input: ActividadInput,
  autorId: string,
  institucionId?: string | null
) => {
  return prisma.actividad.create({
    data: {
      titulo: input.titulo,
      contenido: input.contenido,
      urlArchivo: input.urlImagen || input.urlVideo || null,
      autorId,
      institucionId: institucionId || input.institucionId || null,
      publicado: input.publicado !== undefined ? input.publicado : true,
    },
    include: {
      autor: { select: { id: true, nombre: true, apellido: true } },
      institucion: { select: { id: true, nombre: true, slug: true } },
    },
  });
};

// Obtener todas las actividades globales (públicas - para landing principal)
// Solo actividades sin institucionId (globales) y publicadas
export const findAllActividades = async (limit?: number) => {
  return prisma.actividad.findMany({
    where: {
      institucionId: null,
      publicado: true,
    },
    include: {
      autor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 50,
  });
};

// Obtener actividades por institución (para landing de institución)
export const findActividadesByInstitucion = async (institucionId: string, limit?: number) => {
  return prisma.actividad.findMany({
    where: {
      institucionId,
      publicado: true,
    },
    include: {
      autor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 50,
  });
};

// Obtener actividades por slug de institución
export const findActividadesBySlug = async (slug: string, limit?: number) => {
  const institucion = await prisma.institucion.findUnique({
    where: { slug },
  });

  if (!institucion) {
    return [];
  }

  return findActividadesByInstitucion(institucion.id, limit);
};

// Obtener actividades globales (sin institución)
export const findActividadesGlobales = async (limit?: number) => {
  return prisma.actividad.findMany({
    where: {
      institucionId: null,
      publicado: true,
    },
    include: {
      autor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 50,
  });
};

// Obtener todas las actividades para admin (incluye no publicadas)
export const findAllActividadesAdmin = async (
  filters?: {
    institucionId?: string;
    publicado?: boolean;
  },
  limit?: number
) => {
  const where: any = {};
  if (filters?.institucionId !== undefined) {
    where.institucionId = filters.institucionId || null;
  }
  if (filters?.publicado !== undefined) {
    where.publicado = filters.publicado;
  }

  return prisma.actividad.findMany({
    where,
    include: {
      autor: { select: { id: true, nombre: true, apellido: true } },
      institucion: { select: { id: true, nombre: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 100,
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

// Buscar actividades por título (solo publicadas y globales por defecto)
export const searchActividades = async (query: string, limit?: number, institucionId?: string | null) => {
  const where: any = {
    publicado: true,
    OR: [
      { titulo: { contains: query, mode: 'insensitive' } },
      { contenido: { contains: query, mode: 'insensitive' } },
    ],
  };

  // Si se especifica institucionId, buscar en esa institución
  // Si es null explícito, buscar solo globales
  // Si no se especifica, buscar globales
  if (institucionId !== undefined) {
    where.institucionId = institucionId;
  } else {
    where.institucionId = null;
  }

  return prisma.actividad.findMany({
    where,
    include: {
      autor: { select: { nombre: true, apellido: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit || 20,
  });
};

// Verificar si director puede crear actividades
export const canDirectorCreateActividad = async (institucionId: string): Promise<boolean> => {
  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
    select: { autogestionActividades: true },
  });

  return institucion?.autogestionActividades || false;
};
