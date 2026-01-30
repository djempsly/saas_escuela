import { Role, SistemaEducativo } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateSecurePassword, generateUsername } from '../utils/security';

export const createInstitucion = async (input: any) => {
  const { director, colores, sistemaEducativo, ...rest } = input;

  // Validate SistemaEducativo
  if (!sistemaEducativo || !Object.values(SistemaEducativo).includes(sistemaEducativo as SistemaEducativo)) {
    throw new Error(`Sistema educativo inválido o no proporcionado: ${sistemaEducativo}`);
  }

  // Verificar si el email del director ya existe
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
        email: director.email,
        password: hashedPassword,
        role: Role.DIRECTOR,
        debeCambiarPassword: true,
      },
    });

    // 2. Create Institution
    const newInstitucion = await tx.institucion.create({
      data: {
        ...rest,
        sistema: sistemaEducativo as SistemaEducativo,
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
  return prisma.institucion.delete({
    where: { id },
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
