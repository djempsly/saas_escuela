import { PrismaClient, SistemaEducativo, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { InstitucionInput, ROLES } from '../utils/zod.schemas';

const prisma = new PrismaClient();

export const createInstitucion = async (input: InstitucionInput) => {
  const { director, colores, sistemaEducativo, ...rest } = input;

  // Validate SistemaEducativo if provided
  let sistema: SistemaEducativo;
  if (sistemaEducativo) {
    if (!Object.values(SistemaEducativo).includes(sistemaEducativo as SistemaEducativo)) {
      throw new Error(`Sistema educativo inválido: ${sistemaEducativo}`);
    }
    sistema = sistemaEducativo as SistemaEducativo;
  } else {
    // Default or Error? Schema says optional, Prisma says mandatory?
    // Prisma: sistema SistemaEducativo
    // We should probably default it based on Pais or make it required.
    // For now, let's assume it's required in business logic or default to a safe one.
    // Given the SaaS context, let's default to PRIMARIA_DO if not specified and country is RD?
    // Better: throw if not provided, since it drives logic.
    // But Zod schema says optional. Let's rely on Prisma to throw if missing, or handle it.
    // Actually, let's just assume it's provided or throw.
    throw new Error('El sistema educativo es requerido para crear la institución');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(director.password, 10);

  return prisma.$transaction(async (tx) => {
    // 1. Create Director User (without institucionId yet)
    const newDirector = await tx.user.create({
      data: {
        nombre: director.nombre,
        apellido: director.apellido,
        username: director.email, // Use email as username for now
        email: director.email,
        password: hashedPassword,
        role: Role.DIRECTOR, // Use Prisma Enum
      },
    });

    // 2. Create Institution
    const newInstitucion = await tx.institucion.create({
      data: {
        ...rest,
        sistema,
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

    return newInstitucion;
  });
};

export const findInstituciones = async () => {
  return prisma.institucion.findMany({
    include: {
      director: {
        select: {
          id: true,
          nombre: true,
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
              email: true
            }
          }
    }
  });
};

export const updateInstitucion = async (id: string, input: Partial<InstitucionInput>) => {
  const { director, colores, sistemaEducativo, ...rest } = input;
  
  // Mapping logic for partial update
  const data: any = { ...rest };
  if (colores?.primario) data.colorPrimario = colores.primario;
  if (colores?.secundario) data.colorSecundario = colores.secundario;
  if (sistemaEducativo) data.sistema = sistemaEducativo as SistemaEducativo;

  // Note: Updating director details (password/email) via this endpoint is not implemented/recommended.
  // We ignore 'director' field here.

  return prisma.institucion.update({
    where: { id },
    data,
  });
};

export const deleteInstitucion = async (id: string) => {
  // Cascading delete might be needed?
  // Prisma relation: director is strictly linked.
  // Deleting institution might fail if director exists?
  // Or director should be kept?
  // Usually, if we delete the institution, we delete the data.
  // But the director is a User.
  // Let's just try to delete the institution.
  return prisma.institucion.delete({
    where: { id },
  });
};