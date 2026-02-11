import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateSecurePassword, generateUsername } from '../utils/security';
import { ConflictError, NotFoundError, ValidationError } from '../errors';

interface CreateDirectorInput {
  nombre: string;
  apellido: string;
  email?: string;
}

// Crear director con contraseña temporal
export const createDirector = async (input: CreateDirectorInput, institucionId?: string) => {
  const { nombre, apellido, email } = input;

  // Verificar si el email ya existe (solo si se proporcionó)
  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('El correo electrónico ya está en uso');
    }
  }

  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  const username = generateUsername(nombre, apellido);

  const result = await prisma.$transaction(async (tx) => {
    // Crear usuario director
    const director = await tx.user.create({
      data: {
        nombre,
        apellido,
        username,
        email: email || null,
        password: hashedPassword,
        role: Role.DIRECTOR,
        institucionId: institucionId || null,
        debeCambiarPassword: true,
      },
    });

    // Si hay institucionId, crear entrada en historial
    if (institucionId) {
      await tx.historialDirector.create({
        data: {
          institucionId,
          directorId: director.id,
          fechaInicio: new Date(),
        },
      });
    }

    return director;
  });

  return { director: result, tempPassword };
};

// Reasignar director a otra institución (guarda historial)
export const reassignDirector = async (
  directorId: string,
  newInstitucionId: string,
  motivo?: string,
) => {
  // Verificar que el director existe y es DIRECTOR
  const director = await prisma.user.findUnique({
    where: { id: directorId },
    include: { directorDe: true },
  });

  if (!director) {
    throw new NotFoundError('Director no encontrado');
  }

  if (director.role !== Role.DIRECTOR) {
    throw new ValidationError('El usuario no tiene rol de Director');
  }

  // Verificar que la nueva institución existe
  const newInstitucion = await prisma.institucion.findUnique({
    where: { id: newInstitucionId },
  });

  if (!newInstitucion) {
    throw new NotFoundError('Institución destino no encontrada');
  }

  // Verificar que la nueva institución no tiene ya un director asignado
  if (newInstitucion.directorId && newInstitucion.directorId !== directorId) {
    throw new ConflictError('La institución destino ya tiene un director asignado');
  }

  const oldInstitucionId = director.institucionId;

  const result = await prisma.$transaction(async (tx) => {
    // Si tenía institución anterior, cerrar historial y quitar como director
    if (oldInstitucionId) {
      // Cerrar historial anterior
      await tx.historialDirector.updateMany({
        where: {
          directorId,
          institucionId: oldInstitucionId,
          fechaFin: null,
        },
        data: {
          fechaFin: new Date(),
          motivo: motivo || 'Reasignación a otra institución',
        },
      });

      // Quitar al director de la institución anterior (si era el director)
      const oldInstitucion = await tx.institucion.findUnique({
        where: { id: oldInstitucionId },
      });

      if (oldInstitucion && oldInstitucion.directorId === directorId) {
        // No podemos dejar la institución sin director por restricción unique
        // Se debe asignar otro director primero o manejar de otra forma
      }
    }

    // Actualizar institución nueva con el nuevo director
    await tx.institucion.update({
      where: { id: newInstitucionId },
      data: { directorId },
    });

    // Actualizar usuario con nueva institucionId
    const updatedDirector = await tx.user.update({
      where: { id: directorId },
      data: { institucionId: newInstitucionId },
    });

    // Crear nuevo historial
    await tx.historialDirector.create({
      data: {
        institucionId: newInstitucionId,
        directorId,
        fechaInicio: new Date(),
      },
    });

    return updatedDirector;
  });

  return result;
};

// Obtener historial de directores de una institución
export const getDirectorHistory = async (institucionId: string) => {
  const historial = await prisma.historialDirector.findMany({
    where: { institucionId },
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
    orderBy: { fechaInicio: 'desc' },
  });

  return historial;
};

// Obtener todos los directores del sistema
export const findAllDirectores = async () => {
  return prisma.user.findMany({
    where: { role: Role.DIRECTOR },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      username: true,
      activo: true,
      institucionId: true,
      directorDe: {
        select: {
          id: true,
          nombre: true,
          slug: true,
        },
      },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

// Asignar director a institución (para nuevas instituciones)
export const assignDirectorToInstitucion = async (directorId: string, institucionId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    // Actualizar institución
    await tx.institucion.update({
      where: { id: institucionId },
      data: { directorId },
    });

    // Actualizar usuario
    await tx.user.update({
      where: { id: directorId },
      data: { institucionId },
    });

    // Crear historial
    await tx.historialDirector.create({
      data: {
        institucionId,
        directorId,
        fechaInicio: new Date(),
      },
    });

    return { success: true };
  });

  return result;
};
