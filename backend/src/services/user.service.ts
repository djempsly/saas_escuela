import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { CrearUsuarioInput } from '../utils/zod.schemas';
import { generateSecurePassword, generateUsername } from '../utils/security';

export const createUser = async (input: CrearUsuarioInput, institucionId: string | null) => {
  const { email, nombre, apellido, rol } = input;

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('El correo electrónico ya está en uso');
    }
  }

  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  const username = generateUsername(nombre, apellido);

  const user = await prisma.user.create({
    data: {
      nombre,
      apellido,
      username,
      email: email || null,
      password: hashedPassword,
      role: rol as Role,
      institucionId: institucionId || null,
      debeCambiarPassword: true,
    },
  });

  return { user, tempPassword };
};

export const resetUserPasswordManual = async (
  targetUserId: string,
  requester: { id: string; institucionId: string | null; role: string }
) => {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!targetUser) {
    throw new Error('Usuario no encontrado');
  }

  // SEGURIDAD: Verificar que el usuario objetivo esté activo
  if (!targetUser.activo) {
    throw new Error('No se puede resetear la contraseña de un usuario desactivado');
  }

  // 1. Multi-tenant Check: Must be in same institution (unless Requester is ADMIN)
  if (requester.role !== Role.ADMIN) {
    if (targetUser.institucionId !== requester.institucionId) {
      throw new Error('No tienes permisos para gestionar este usuario (Institución distinta)');
    }
  }

  // 2. Hierarchy Check - ADMIN
  if (requester.role === Role.ADMIN) {
    // ADMIN no puede resetear a otro ADMIN (para evitar escalación)
    if (targetUser.role === Role.ADMIN && targetUser.id !== requester.id) {
      throw new Error('No tienes permisos para resetear la contraseña de otro administrador');
    }
  }

  // 3. Hierarchy Check - DIRECTOR
  if (requester.role === Role.DIRECTOR) {
    if (targetUser.role === Role.ADMIN || targetUser.role === Role.DIRECTOR) {
      throw new Error('No tienes permisos para resetear la contraseña de este usuario (Jerarquía)');
    }
  }

  // 4. Hierarchy Check - SECRETARIA (usando enum para consistencia)
  if (requester.role === Role.SECRETARIA) {
    const privilegedRoles: Role[] = [
      Role.ADMIN,
      Role.DIRECTOR,
      Role.COORDINADOR,
      Role.COORDINADOR_ACADEMICO
    ];
    if (privilegedRoles.includes(targetUser.role)) {
      throw new Error('No tienes permisos para resetear la contraseña de personal directivo');
    }
  }

  // 5. Generate Temp Password usando crypto seguro
  const tempPassword = generateSecurePassword();

  // 6. Update User
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: hashedPassword,
      debeCambiarPassword: true,
    },
  });

  return { tempPassword };
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      institucionId: true,
      createdAt: true,
    },
  });
};

export const findUsersByInstitucion = async (institucionId: string, role?: string) => {
  return prisma.user.findMany({
    where: {
      institucionId,
      ...(role && { role: role as Role })
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateUserProfile = async (
  userId: string,
  data: { nombre?: string; apellido?: string; email?: string; fotoUrl?: string }
) => {
  // Verificar si el email ya está en uso por otro usuario
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: userId },
      },
    });
    if (existingUser) {
      throw new Error('El correo electrónico ya está en uso');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.apellido && { apellido: data.apellido }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.fotoUrl !== undefined && { fotoUrl: data.fotoUrl }),
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      username: true,
      role: true,
      fotoUrl: true,
      institucionId: true,
    },
  });
};

export const updateUserById = async (
  userId: string,
  data: { nombre?: string; apellido?: string; email?: string; activo?: boolean },
  requesterInstitucionId: string | null,
  requesterRole: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar permisos multi-tenant
  if (requesterRole !== Role.ADMIN && user.institucionId !== requesterInstitucionId) {
    throw new Error('No tienes permisos para modificar este usuario');
  }

  // Verificar si el email ya está en uso
  if (data.email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT: { id: userId },
      },
    });
    if (existingUser) {
      throw new Error('El correo electrónico ya está en uso');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.apellido && { apellido: data.apellido }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
    },
  });
};
