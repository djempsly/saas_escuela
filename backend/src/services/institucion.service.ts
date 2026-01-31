import { Role, SistemaEducativo, Idioma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateSecurePassword, generateUsername } from '../utils/security';

// Función para generar slug desde nombre
export const generateSlug = (nombre: string): string => {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo alfanuméricos, espacios y guiones
    .trim()
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-'); // Múltiples guiones a uno solo
};

// Función para generar slug único
const generateUniqueSlug = async (nombre: string): Promise<string> => {
  const baseSlug = generateSlug(nombre);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.institucion.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const createInstitucion = async (input: any) => {
  const { director, directorId, colores, sistemaEducativo, idiomaPrincipal, slug: inputSlug, dominioPersonalizado, autogestionActividades, ...rest } = input;

  // Validate SistemaEducativo
  if (!sistemaEducativo || !Object.values(SistemaEducativo).includes(sistemaEducativo as SistemaEducativo)) {
    throw new Error(`Sistema educativo inválido o no proporcionado: ${sistemaEducativo}`);
  }

  // Generar slug único
  const slug = inputSlug ? generateSlug(inputSlug) : await generateUniqueSlug(rest.nombre);

  // Verificar unicidad del slug
  const existingSlug = await prisma.institucion.findUnique({ where: { slug } });
  if (existingSlug) {
    throw new Error('El slug ya está en uso por otra institución');
  }

  // Verificar unicidad del dominio personalizado si se proporciona
  if (dominioPersonalizado) {
    const existingDominio = await prisma.institucion.findUnique({
      where: { dominioPersonalizado },
    });
    if (existingDominio) {
      throw new Error('El dominio personalizado ya está en uso');
    }
  }

  // Caso 1: Usar director existente
  if (directorId) {
    const existingDirector = await prisma.user.findUnique({ where: { id: directorId } });
    if (!existingDirector) {
      throw new Error('Director no encontrado');
    }
    if (existingDirector.role !== Role.DIRECTOR) {
      throw new Error('El usuario seleccionado no tiene rol de Director');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crear institución con director existente
      const newInstitucion = await tx.institucion.create({
        data: {
          ...rest,
          slug,
          dominioPersonalizado: dominioPersonalizado || null,
          autogestionActividades: autogestionActividades || false,
          sistema: sistemaEducativo as SistemaEducativo,
          idiomaPrincipal: idiomaPrincipal as Idioma || Idioma.ESPANOL,
          colorPrimario: colores?.primario || '#000000',
          colorSecundario: colores?.secundario || '#ffffff',
          directorId: existingDirector.id,
        },
      });

      // Actualizar director con nueva institucionId
      await tx.user.update({
        where: { id: existingDirector.id },
        data: { institucionId: newInstitucion.id },
      });

      // Crear historial de director
      await tx.historialDirector.create({
        data: {
          institucionId: newInstitucion.id,
          directorId: existingDirector.id,
          fechaInicio: new Date(),
        },
      });

      return { institucion: newInstitucion, tempPassword: null };
    });

    return result;
  }

  // Caso 2: Crear nuevo director
  if (!director) {
    throw new Error('Debe proporcionar un director existente (directorId) o datos para crear uno nuevo (director)');
  }

  // Verificar si el email del director ya existe (solo si se proporcionó)
  if (director.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: director.email }
    });
    if (existingUser) {
      throw new Error('El correo electrónico del director ya está en uso');
    }
  }

  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  const username = generateUsername(director.nombre, director.apellido);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Director User (without institucionId yet)
    const newDirector = await tx.user.create({
      data: {
        nombre: director.nombre,
        apellido: director.apellido,
        username,
        email: director.email || null,
        password: hashedPassword,
        role: Role.DIRECTOR,
        debeCambiarPassword: true,
      },
    });

    // 2. Create Institution with slug and new fields
    const newInstitucion = await tx.institucion.create({
      data: {
        ...rest,
        slug,
        dominioPersonalizado: dominioPersonalizado || null,
        autogestionActividades: autogestionActividades || false,
        sistema: sistemaEducativo as SistemaEducativo,
        idiomaPrincipal: idiomaPrincipal as Idioma || Idioma.ESPANOL,
        colorPrimario: colores?.primario || '#000000',
        colorSecundario: colores?.secundario || '#ffffff',
        directorId: newDirector.id,
      },
    });

    // 3. Update Director with InstitucionId
    await tx.user.update({
      where: { id: newDirector.id },
      data: { institucionId: newInstitucion.id },
    });

    // 4. Create initial director history entry
    await tx.historialDirector.create({
      data: {
        institucionId: newInstitucion.id,
        directorId: newDirector.id,
        fechaInicio: new Date(),
      },
    });

    return { institucion: newInstitucion, tempPassword };
  });

  return result;
};

export const findInstituciones = async () => {
  return prisma.institucion.findMany({
    include: {
      director: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true
        }
      }
    }
  });
};

export const findInstitucionById = async (id: string) => {
  return prisma.institucion.findUnique({
    where: { id },
    include: {
      director: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true
        }
      }
    }
  });
};

export const updateInstitucion = async (id: string, input: any) => {
  const { director, colores, sistemaEducativo, ...rest } = input;

  const data: any = { ...rest };
  if (colores?.primario) data.colorPrimario = colores.primario;
  if (colores?.secundario) data.colorSecundario = colores.secundario;
  if (sistemaEducativo) data.sistema = sistemaEducativo as SistemaEducativo;

  return prisma.institucion.update({
    where: { id },
    data,
  });
};

export const deleteInstitucion = async (id: string) => {
  // Verificar que la institución existe
  const institucion = await prisma.institucion.findUnique({
    where: { id },
    include: {
      usuarios: { select: { id: true } },
      niveles: { select: { id: true } },
      clases: { select: { id: true } },
    },
  });

  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  // Verificar si tiene registros relacionados críticos
  if (institucion.usuarios.length > 0 || institucion.niveles.length > 0 || institucion.clases.length > 0) {
    throw new Error(
      `No se puede eliminar la institución porque tiene registros asociados: ` +
      `${institucion.usuarios.length} usuarios, ` +
      `${institucion.niveles.length} niveles, ` +
      `${institucion.clases.length} clases. ` +
      `Desactive la institución en lugar de eliminarla.`
    );
  }

  // Eliminar en transacción
  return prisma.$transaction(async (tx) => {
    // 1. Eliminar historial de directores
    await tx.historialDirector.deleteMany({
      where: { institucionId: id },
    });

    // 2. Desasociar el director de la institución
    if (institucion.directorId) {
      await tx.user.update({
        where: { id: institucion.directorId },
        data: { institucionId: null },
      });
    }

    // 3. Eliminar actividades de la institución
    await tx.actividad.deleteMany({
      where: { institucionId: id },
    });

    // 4. Finalmente eliminar la institución
    return tx.institucion.delete({
      where: { id },
    });
  });
};

// Obtener configuración de branding (pública para login)
export const getInstitucionBranding = async (id: string) => {
  return prisma.institucion.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      colorPrimario: true,
      colorSecundario: true,
      pais: true,
      sistema: true,
      idiomaPrincipal: true,
    },
  });
};

// Actualizar configuración de branding (Solo ADMIN)
export const updateInstitucionConfig = async (
  id: string,
  input: {
    colorPrimario?: string;
    colorSecundario?: string;
    logoUrl?: string;
    lema?: string;
  }
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
  });

  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  return prisma.institucion.update({
    where: { id },
    data: {
      colorPrimario: input.colorPrimario,
      colorSecundario: input.colorSecundario,
      logoUrl: input.logoUrl,
      lema: input.lema,
    },
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      colorPrimario: true,
      colorSecundario: true,
    },
  });
};

// ===== NUEVOS MÉTODOS PARA SUPER ADMIN =====

// Buscar institución por slug
export const findInstitucionBySlug = async (slug: string) => {
  return prisma.institucion.findUnique({
    where: { slug },
    include: {
      director: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
    },
  });
};

// Buscar institución por dominio personalizado
export const findInstitucionByDominio = async (dominio: string) => {
  return prisma.institucion.findUnique({
    where: { dominioPersonalizado: dominio },
    include: {
      director: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
        },
      },
    },
  });
};

// Obtener branding por slug (público)
export const getInstitucionBrandingBySlug = async (slug: string) => {
  return prisma.institucion.findUnique({
    where: { slug },
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      colorPrimario: true,
      colorSecundario: true,
      pais: true,
      sistema: true,
      idiomaPrincipal: true,
      slug: true,
      autogestionActividades: true,
    },
  });
};

// Obtener branding por dominio (público)
export const getInstitucionBrandingByDominio = async (dominio: string) => {
  return prisma.institucion.findUnique({
    where: { dominioPersonalizado: dominio },
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      colorPrimario: true,
      colorSecundario: true,
      pais: true,
      sistema: true,
      idiomaPrincipal: true,
      slug: true,
      autogestionActividades: true,
    },
  });
};

// Actualizar configuración sensible (Solo ADMIN)
export const updateSensitiveConfig = async (
  id: string,
  input: {
    nombre?: string;
    slug?: string;
    dominioPersonalizado?: string | null;
    idiomaPrincipal?: Idioma;
    activo?: boolean;
    autogestionActividades?: boolean;
  }
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
  });

  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  // Verificar unicidad del slug si se está cambiando
  if (input.slug && input.slug !== institucion.slug) {
    const existingSlug = await prisma.institucion.findUnique({
      where: { slug: input.slug },
    });
    if (existingSlug) {
      throw new Error('El slug ya está en uso por otra institución');
    }
  }

  // Verificar unicidad del dominio si se está cambiando
  if (input.dominioPersonalizado && input.dominioPersonalizado !== institucion.dominioPersonalizado) {
    const existingDominio = await prisma.institucion.findUnique({
      where: { dominioPersonalizado: input.dominioPersonalizado },
    });
    if (existingDominio) {
      throw new Error('El dominio personalizado ya está en uso');
    }
  }

  return prisma.institucion.update({
    where: { id },
    data: {
      ...(input.nombre && { nombre: input.nombre }),
      ...(input.slug && { slug: generateSlug(input.slug) }),
      ...(input.dominioPersonalizado !== undefined && { dominioPersonalizado: input.dominioPersonalizado }),
      ...(input.idiomaPrincipal && { idiomaPrincipal: input.idiomaPrincipal }),
      ...(input.activo !== undefined && { activo: input.activo }),
      ...(input.autogestionActividades !== undefined && { autogestionActividades: input.autogestionActividades }),
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
