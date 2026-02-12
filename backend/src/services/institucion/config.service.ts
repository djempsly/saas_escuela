import { Prisma, Idioma } from '@prisma/client';
import prisma from '../../config/db';
import { ConflictError, NotFoundError } from '../../errors';
import { generateSlug } from './crud.service';

// Actualizar configuración de branding (Solo ADMIN)
export const updateInstitucionConfig = async (
  id: string,
  input: {
    colorPrimario?: string;
    colorSecundario?: string;
    logoUrl?: string;
    fondoLoginUrl?: string;
    lema?: string;
    direccion?: string;
    codigoCentro?: string;
    distritoEducativo?: string;
    regionalEducacion?: string;
    sabanaColores?: string;
  },
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
  });

  if (!institucion) {
    throw new NotFoundError('Institución no encontrada');
  }

  // Construir objeto de actualización solo con campos que tienen valor
  const updateData: Partial<{
    colorPrimario: string;
    colorSecundario: string;
    logoUrl: string;
    fondoLoginUrl: string;
    lema: string | null;
    direccion: string | null;
    codigoCentro: string | null;
    distritoEducativo: string | null;
    regionalEducacion: string | null;
    sabanaColores: Prisma.InputJsonValue;
  }> = {};

  if (input.colorPrimario) {
    updateData.colorPrimario = input.colorPrimario;
  }
  if (input.colorSecundario) {
    updateData.colorSecundario = input.colorSecundario;
  }
  if (input.logoUrl) {
    updateData.logoUrl = input.logoUrl;
  }
  if (input.fondoLoginUrl) {
    updateData.fondoLoginUrl = input.fondoLoginUrl;
  }
  if (input.lema !== undefined) {
    updateData.lema = input.lema || null;
  }
  if (input.direccion !== undefined) {
    updateData.direccion = input.direccion || null;
  }
  if (input.codigoCentro !== undefined) {
    updateData.codigoCentro = input.codigoCentro || null;
  }
  if (input.distritoEducativo !== undefined) {
    updateData.distritoEducativo = input.distritoEducativo || null;
  }
  if (input.regionalEducacion !== undefined) {
    updateData.regionalEducacion = input.regionalEducacion || null;
  }
  if (input.sabanaColores) {
    try {
      updateData.sabanaColores = JSON.parse(input.sabanaColores);
    } catch {
      // Si no es JSON válido, ignorar
    }
  }

  // Si no hay nada que actualizar, retornar la institución actual
  if (Object.keys(updateData).length === 0) {
    return prisma.institucion.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        lema: true,
        logoUrl: true,
        fondoLoginUrl: true,
        colorPrimario: true,
        colorSecundario: true,
      },
    });
  }

  return prisma.institucion.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      fondoLoginUrl: true,
      colorPrimario: true,
      colorSecundario: true,
    },
  });
};

// Actualizar configuración sensible (Solo ADMIN)
export const updateSensitiveConfig = async (
  id: string,
  input: {
    nombre?: string;
    nombreMostrar?: string | null;
    slug?: string;
    dominioPersonalizado?: string | null;
    idiomaPrincipal?: Idioma;
    logoPosicion?: string;
    logoWidth?: number;
    logoHeight?: number;
    fondoLoginUrl?: string | null;
    activo?: boolean;
    autogestionActividades?: boolean;
    // Landing page fields
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    // Login page fields
    loginBgType?: string;
    loginBgColor?: string;
    loginBgGradient?: string | null;
  },
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
  });

  if (!institucion) {
    throw new NotFoundError('Institución no encontrada');
  }

  // Verificar unicidad del slug si se está cambiando
  if (input.slug && input.slug !== institucion.slug) {
    const existingSlug = await prisma.institucion.findUnique({
      where: { slug: input.slug },
    });
    if (existingSlug) {
      throw new ConflictError('El slug ya está en uso por otra institución');
    }
  }

  // Verificar unicidad del dominio si se está cambiando
  if (
    input.dominioPersonalizado &&
    input.dominioPersonalizado !== institucion.dominioPersonalizado
  ) {
    const existingDominio = await prisma.institucion.findUnique({
      where: { dominioPersonalizado: input.dominioPersonalizado },
    });
    if (existingDominio) {
      throw new ConflictError('El dominio personalizado ya está en uso');
    }
  }

  return prisma.institucion.update({
    where: { id },
    data: {
      ...(input.nombre && { nombre: input.nombre }),
      ...(input.nombreMostrar !== undefined && { nombreMostrar: input.nombreMostrar }),
      ...(input.slug && { slug: generateSlug(input.slug) }),
      ...(input.dominioPersonalizado !== undefined && {
        dominioPersonalizado: input.dominioPersonalizado,
      }),
      ...(input.idiomaPrincipal && { idiomaPrincipal: input.idiomaPrincipal }),
      ...(input.logoPosicion && { logoPosicion: input.logoPosicion }),
      ...(input.logoWidth !== undefined && { logoWidth: input.logoWidth }),
      ...(input.logoHeight !== undefined && { logoHeight: input.logoHeight }),
      ...(input.fondoLoginUrl !== undefined && { fondoLoginUrl: input.fondoLoginUrl }),
      ...(input.activo !== undefined && { activo: input.activo }),
      // Landing page fields
      ...(input.heroTitle !== undefined && { heroTitle: input.heroTitle }),
      ...(input.heroSubtitle !== undefined && { heroSubtitle: input.heroSubtitle }),
      // Login page fields
      ...(input.loginBgType && { loginBgType: input.loginBgType }),
      ...(input.loginBgColor && { loginBgColor: input.loginBgColor }),
      ...(input.loginBgGradient !== undefined && { loginBgGradient: input.loginBgGradient }),
      ...(input.autogestionActividades !== undefined && {
        autogestionActividades: input.autogestionActividades,
      }),
    },
  });
};

// Verificar disponibilidad de slug
export const checkSlugAvailability = async (slug: string, excludeId?: string) => {
  const existing = await prisma.institucion.findUnique({
    where: { slug: generateSlug(slug) },
  });

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
};

// Verificar disponibilidad de dominio
export const checkDominioAvailability = async (dominio: string, excludeId?: string) => {
  const existing = await prisma.institucion.findUnique({
    where: { dominioPersonalizado: dominio },
  });

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
};
