import { Role, SistemaEducativo, Idioma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateSecurePassword, generateUsername } from '../utils/security';
import { getMateriasOficiales } from '../utils/materias-oficiales';

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
  const { director, directorId, colores, sistemaEducativo, sistemasEducativos, idiomaPrincipal, slug: inputSlug, dominioPersonalizado, autogestionActividades, ...rest } = input;

  // Debug: Log received values
  console.log('Creating institution with:', {
    idiomaPrincipal,
    sistemaEducativo,
    sistemasEducativos,
    pais: rest.pais,
    nombre: rest.nombre
  });

  // Validate SistemaEducativo
  if (!sistemaEducativo || !Object.values(SistemaEducativo).includes(sistemaEducativo as SistemaEducativo)) {
    throw new Error(`Sistema educativo inválido o no proporcionado: ${sistemaEducativo}`);
  }

  // Validar sistemas educativos adicionales si se proporcionan
  const sistemasValidos: SistemaEducativo[] = [];
  if (sistemasEducativos && Array.isArray(sistemasEducativos)) {
    for (const sistema of sistemasEducativos) {
      if (Object.values(SistemaEducativo).includes(sistema as SistemaEducativo)) {
        sistemasValidos.push(sistema as SistemaEducativo);
      }
    }
  }
  // Siempre incluir el sistema principal
  if (!sistemasValidos.includes(sistemaEducativo as SistemaEducativo)) {
    sistemasValidos.push(sistemaEducativo as SistemaEducativo);
  }

  // Validate and resolve idiomaPrincipal
  let resolvedIdioma: Idioma = Idioma.ESPANOL;
  if (idiomaPrincipal && Object.values(Idioma).includes(idiomaPrincipal as Idioma)) {
    resolvedIdioma = idiomaPrincipal as Idioma;
  }
  console.log('Resolved idioma:', resolvedIdioma);
  console.log('Sistemas educativos a crear:', sistemasValidos);

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
          idiomaPrincipal: resolvedIdioma,
          colorPrimario: colores?.primario || '#000000',
          colorSecundario: colores?.secundario || '#ffffff',
          directorId: existingDirector.id,
        },
      });

      // Crear registros de sistemas educativos que ofrece la institución
      for (const sistema of sistemasValidos) {
        await tx.institucionSistemaEducativo.create({
          data: {
            institucionId: newInstitucion.id,
            sistema,
          },
        });
      }

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
        idiomaPrincipal: resolvedIdioma,
        colorPrimario: colores?.primario || '#000000',
        colorSecundario: colores?.secundario || '#ffffff',
        directorId: newDirector.id,
      },
    });

    // 3. Crear registros de sistemas educativos que ofrece la institución
    for (const sistema of sistemasValidos) {
      await tx.institucionSistemaEducativo.create({
        data: {
          institucionId: newInstitucion.id,
          sistema,
        },
      });
    }

    // 4. Update Director with InstitucionId
    await tx.user.update({
      where: { id: newDirector.id },
      data: { institucionId: newInstitucion.id },
    });

    // 5. Create initial director history entry
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
      },
      sistemasEducativos: {
        select: {
          sistema: true,
          activo: true
        }
      },
      dominios: {
        select: {
          id: true,
          dominio: true,
          verificado: true,
          verificadoAt: true,
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: {
          usuarios: true
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
      },
      sistemasEducativos: {
        select: {
          sistema: true,
          activo: true
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
      logoPosicion: true,
      logoWidth: true,
      logoHeight: true,
      fondoLoginUrl: true,
      loginLogoUrl: true,
      loginBgType: true,
      loginBgColor: true,
      loginBgGradient: true,
      faviconUrl: true,
      heroImageUrl: true,
      heroTitle: true,
      heroSubtitle: true,
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

// Actualizar configuración de branding (Solo ADMIN)
export const updateInstitucionConfig = async (
  id: string,
  input: {
    colorPrimario?: string;
    colorSecundario?: string;
    logoUrl?: string;
    fondoLoginUrl?: string;
    lema?: string;
  }
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
  });

  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  // Construir objeto de actualización solo con campos que tienen valor
  const updateData: Partial<{
    colorPrimario: string;
    colorSecundario: string;
    logoUrl: string;
    fondoLoginUrl: string;
    lema: string | null;
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
      logoPosicion: true,
      logoWidth: true,
      logoHeight: true,
      fondoLoginUrl: true,
      loginLogoUrl: true,
      loginBgType: true,
      loginBgColor: true,
      loginBgGradient: true,
      faviconUrl: true,
      heroImageUrl: true,
      heroTitle: true,
      heroSubtitle: true,
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
// Busca primero en InstitucionDominio (verificado), luego fallback a dominioPersonalizado (legacy)
export const getInstitucionBrandingByDominio = async (dominio: string) => {
  const brandingSelect = {
    id: true,
    nombre: true,
    lema: true,
    logoUrl: true,
    logoPosicion: true,
    logoWidth: true,
    logoHeight: true,
    fondoLoginUrl: true,
    loginLogoUrl: true,
    loginBgType: true,
    loginBgColor: true,
    loginBgGradient: true,
    faviconUrl: true,
    heroImageUrl: true,
    heroTitle: true,
    heroSubtitle: true,
    colorPrimario: true,
    colorSecundario: true,
    pais: true,
    sistema: true,
    idiomaPrincipal: true,
    slug: true,
    autogestionActividades: true,
  };

  // 1. Buscar en tabla InstitucionDominio (dominios verificados)
  const dominioRegistro = await prisma.institucionDominio.findUnique({
    where: { dominio, verificado: true },
    include: {
      institucion: {
        select: brandingSelect,
      },
    },
  });

  if (dominioRegistro && dominioRegistro.institucion) {
    return dominioRegistro.institucion;
  }

  // 2. Fallback: buscar por dominioPersonalizado directo (campo legacy)
  return prisma.institucion.findFirst({
    where: { dominioPersonalizado: dominio, activo: true },
    select: brandingSelect,
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
      ...(input.nombreMostrar !== undefined && { nombreMostrar: input.nombreMostrar }),
      ...(input.slug && { slug: generateSlug(input.slug) }),
      ...(input.dominioPersonalizado !== undefined && { dominioPersonalizado: input.dominioPersonalizado }),
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

// Actualizar sistemas educativos de una institución
export const updateSistemasEducativos = async (
  id: string,
  sistemasEducativos: SistemaEducativo[]
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id },
    include: { sistemasEducativos: true },
  });

  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  if (!sistemasEducativos || sistemasEducativos.length === 0) {
    throw new Error('Debe proporcionar al menos un sistema educativo');
  }

  // Validar que todos los sistemas son válidos
  for (const sistema of sistemasEducativos) {
    if (!Object.values(SistemaEducativo).includes(sistema)) {
      throw new Error(`Sistema educativo inválido: ${sistema}`);
    }
  }

  // Identificar sistemas nuevos para sembrar materias oficiales
  const sistemasActuales = institucion.sistemasEducativos.map(s => s.sistema);
  const sistemasNuevos = sistemasEducativos.filter(s => !sistemasActuales.includes(s));

  // Actualizar en transacción
  return prisma.$transaction(async (tx) => {
    // 1. Eliminar los sistemas actuales
    await tx.institucionSistemaEducativo.deleteMany({
      where: { institucionId: id },
    });

    // 2. Crear los nuevos sistemas
    for (const sistema of sistemasEducativos) {
      await tx.institucionSistemaEducativo.create({
        data: {
          institucionId: id,
          sistema,
        },
      });
    }

    // 3. Actualizar el sistema principal de la institución (el primero de la lista)
    const sistemaPrincipal = sistemasEducativos[0];
    await tx.institucion.update({
      where: { id },
      data: { sistema: sistemaPrincipal },
    });

    // 4. Sembrar materias oficiales para sistemas nuevos
    for (const sistema of sistemasNuevos) {
      const { materias, pais, provisional } = getMateriasOficiales(sistema);

      for (const materia of materias) {
        // Verificar si ya existe una materia con el mismo nombre
        const existente = await tx.materia.findFirst({
          where: {
            institucionId: id,
            nombre: materia.nombre,
          },
        });

        if (!existente) {
          await tx.materia.create({
            data: {
              nombre: materia.nombre,
              codigo: materia.codigo,
              descripcion: materia.descripcion,
              tipo: materia.tipo,
              esOficial: true,
              orden: materia.orden,
              pais,
              provisional,
              institucionId: id,
            },
          });
        }
      }
    }

    // 5. Retornar la institución actualizada
    return tx.institucion.findUnique({
      where: { id },
      include: {
        sistemasEducativos: {
          select: {
            sistema: true,
            activo: true,
          },
        },
      },
    });
  });
};

// Sembrar materias oficiales para una institución
export const seedMateriasOficiales = async (
  institucionId: string,
  sistemas?: SistemaEducativo[]
) => {
  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
    include: { sistemasEducativos: true },
  });

  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  // Usar los sistemas proporcionados o los de la institución
  const sistemasToSeed = sistemas || institucion.sistemasEducativos.map(s => s.sistema);

  const materiasCreadas: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const sistema of sistemasToSeed) {
      const { materias, pais, provisional } = getMateriasOficiales(sistema);

      for (const materia of materias) {
        // Verificar si ya existe una materia con el mismo nombre
        const existente = await tx.materia.findFirst({
          where: {
            institucionId,
            nombre: materia.nombre,
          },
        });

        if (!existente) {
          await tx.materia.create({
            data: {
              nombre: materia.nombre,
              codigo: materia.codigo,
              descripcion: materia.descripcion,
              tipo: materia.tipo,
              esOficial: true,
              orden: materia.orden,
              pais,
              provisional,
              institucionId,
            },
          });
          materiasCreadas.push(materia.nombre);
        }
      }
    }
  });

  return { materiasCreadas };
};
