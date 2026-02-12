import { Role, SistemaEducativo, Idioma, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../../config/db';
import { logger } from '../../config/logger';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import { generateSecurePassword, generateUsername } from '../../utils/security';

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

export const createInstitucion = async (input: Record<string, unknown>) => {
  const {
    director: directorRaw,
    directorId,
    colores: coloresRaw,
    sistemaEducativo,
    sistemasEducativos,
    idiomaPrincipal,
    slug: inputSlug,
    dominioPersonalizado,
    autogestionActividades,
    ...rest
  } = input;

  const director = directorRaw as { nombre: string; apellido: string; email?: string } | undefined;
  const colores = coloresRaw as { primario?: string; secundario?: string } | undefined;
  const typedDirectorId = directorId as string | undefined;
  const typedDominioPersonalizado = dominioPersonalizado as string | undefined;
  const typedAutogestionActividades = autogestionActividades as boolean | undefined;

  logger.debug(
    {
      idiomaPrincipal,
      sistemaEducativo,
      sistemasEducativos,
      pais: rest.pais,
      nombre: rest.nombre,
    },
    'Creating institution',
  );

  // Validate SistemaEducativo
  if (
    !sistemaEducativo ||
    !Object.values(SistemaEducativo).includes(sistemaEducativo as SistemaEducativo)
  ) {
    throw new ValidationError(`Sistema educativo inválido o no proporcionado: ${sistemaEducativo}`);
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
  logger.debug({ resolvedIdioma, sistemasValidos }, 'Resolved idioma and sistemas educativos');

  // Generar slug único
  const slug = inputSlug ? generateSlug(inputSlug as string) : await generateUniqueSlug(rest.nombre as string);

  // Verificar unicidad del slug
  const existingSlug = await prisma.institucion.findUnique({ where: { slug } });
  if (existingSlug) {
    throw new ConflictError('El slug ya está en uso por otra institución');
  }

  // Verificar unicidad del dominio personalizado si se proporciona
  if (typedDominioPersonalizado) {
    const existingDominio = await prisma.institucion.findUnique({
      where: { dominioPersonalizado: typedDominioPersonalizado },
    });
    if (existingDominio) {
      throw new ConflictError('El dominio personalizado ya está en uso');
    }
  }

  // Caso 1: Usar director existente
  if (typedDirectorId) {
    const existingDirector = await prisma.user.findUnique({ where: { id: typedDirectorId } });
    if (!existingDirector) {
      throw new NotFoundError('Director no encontrado');
    }
    if (existingDirector.role !== Role.DIRECTOR) {
      throw new ValidationError('El usuario seleccionado no tiene rol de Director');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crear institución con director existente
      const newInstitucion = await tx.institucion.create({
        data: {
          ...rest,
          slug,
          dominioPersonalizado: typedDominioPersonalizado || null,
          autogestionActividades: typedAutogestionActividades || false,
          sistema: sistemaEducativo as SistemaEducativo,
          idiomaPrincipal: resolvedIdioma,
          colorPrimario: colores?.primario || '#000000',
          colorSecundario: colores?.secundario || '#ffffff',
          directorId: existingDirector.id,
        } as Prisma.InstitucionUncheckedCreateInput,
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
    throw new ValidationError(
      'Debe proporcionar un director existente (directorId) o datos para crear uno nuevo (director)',
    );
  }

  // Verificar si el email del director ya existe (solo si se proporcionó)
  if (director.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: director.email },
    });
    if (existingUser) {
      throw new ConflictError('El correo electrónico del director ya está en uso');
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
        dominioPersonalizado: (dominioPersonalizado as string) || null,
        autogestionActividades: (autogestionActividades as boolean) || false,
        sistema: sistemaEducativo as SistemaEducativo,
        idiomaPrincipal: resolvedIdioma,
        colorPrimario: colores?.primario || '#000000',
        colorSecundario: colores?.secundario || '#ffffff',
        directorId: newDirector.id,
      } as Prisma.InstitucionUncheckedCreateInput,
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
          email: true,
        },
      },
      sistemasEducativos: {
        select: {
          sistema: true,
          activo: true,
        },
      },
      dominios: {
        select: {
          id: true,
          dominio: true,
          verificado: true,
          verificadoAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          usuarios: true,
        },
      },
    },
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
          email: true,
        },
      },
      sistemasEducativos: {
        select: {
          sistema: true,
          activo: true,
        },
      },
    },
  });
};

export const updateInstitucion = async (id: string, input: Record<string, unknown>) => {
  const { director, colores: coloresRaw, sistemaEducativo, ...rest } = input;

  const colores = coloresRaw as { primario?: string; secundario?: string } | undefined;
  const data: Record<string, unknown> = { ...rest };
  if (colores?.primario) data.colorPrimario = colores.primario;
  if (colores?.secundario) data.colorSecundario = colores.secundario;
  if (sistemaEducativo) data.sistema = sistemaEducativo as SistemaEducativo;

  return prisma.institucion.update({
    where: { id },
    data: data as Prisma.InstitucionUpdateInput,
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
    throw new NotFoundError('Institución no encontrada');
  }

  // Verificar si tiene registros relacionados críticos
  if (
    institucion.usuarios.length > 0 ||
    institucion.niveles.length > 0 ||
    institucion.clases.length > 0
  ) {
    throw new ValidationError(
      `No se puede eliminar la institución porque tiene registros asociados: ` +
        `${institucion.usuarios.length} usuarios, ` +
        `${institucion.niveles.length} niveles, ` +
        `${institucion.clases.length} clases. ` +
        `Desactive la institución en lugar de eliminarla.`,
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
