import prisma from '../config/db';
import { deleteFile } from '../middleware/upload.middleware';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize';

interface ActividadInput {
  titulo: string;
  contenido: string;
  fotos?: string[];
  videos?: string[];
  institucionId?: string;
  publicado?: boolean;
}

// Crear actividad (ADMIN o DIRECTOR con autogestion)
export const createActividad = async (
  input: ActividadInput,
  autorId: string,
  institucionId?: string | null
) => {
  // Determinar tipoMedia basado en lo que se proporcione
  let tipoMedia = 'mixed';
  if (input.fotos?.length && !input.videos?.length) {
    tipoMedia = 'foto';
  } else if (!input.fotos?.length && input.videos?.length) {
    tipoMedia = 'video';
  }

  return prisma.actividad.create({
    data: {
      titulo: sanitizeText(input.titulo),
      contenido: sanitizeText(input.contenido),
      urlArchivo: input.fotos?.[0] || null, // Compatibilidad con legacy
      fotos: input.fotos || [],
      videos: input.videos || [],
      tipoMedia,
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

  // Determinar tipoMedia basado en lo que se proporcione
  let tipoMedia = existing.tipoMedia;
  if (input.fotos !== undefined || input.videos !== undefined) {
    const hasFotos = input.fotos?.length || (existing.fotos as string[] || []).length > 0;
    const hasVideos = input.videos?.length || (existing.videos as string[] || []).length > 0;

    if (hasFotos && !hasVideos) {
      tipoMedia = 'foto';
    } else if (!hasFotos && hasVideos) {
      tipoMedia = 'video';
    } else {
      tipoMedia = 'mixed';
    }
  }

  const updateData: any = {
    titulo: sanitizeOptional(input.titulo),
    contenido: sanitizeOptional(input.contenido),
    tipoMedia,
  };

  // Actualizar fotos si se proporcionan
  if (input.fotos !== undefined) {
    updateData.fotos = input.fotos;
    updateData.urlArchivo = input.fotos[0] || null; // Compatibilidad legacy
  }

  // Actualizar videos si se proporcionan
  if (input.videos !== undefined) {
    updateData.videos = input.videos;
  }

  // Actualizar publicado si se proporciona
  if (input.publicado !== undefined) {
    updateData.publicado = input.publicado;
  }

  return prisma.actividad.update({
    where: { id },
    data: updateData,
    include: {
      autor: { select: { id: true, nombre: true, apellido: true } },
      institucion: { select: { id: true, nombre: true, slug: true } },
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
