import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { LoginInput, CrearUsuarioInput, ChangePasswordInput } from '../utils/zod.schemas';
import { generateSecurePassword, generateUsername } from '../utils/security';
import { sendPasswordResetEmail } from './email.service';

export const registerSuperAdmin = async (input: CrearUsuarioInput) => {
  const { email, nombre, apellido } = input;

  // SEGURIDAD: Verificar que no existan ADMINs previos
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (existingAdmin) {
    throw new Error('Ya existe un administrador en el sistema. Contacte al administrador existente.');
  }

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
      role: Role.ADMIN,
      debeCambiarPassword: true,
    },
  });

  return { user, tempPassword };
};

export const login = async (input: LoginInput) => {
  const { identificador, password } = input;

  // Buscar por email O username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identificador },
        { username: identificador }
      ]
    }
  });
  if (!user) {
    throw new Error('Credenciales no válidas');
  }

  // SEGURIDAD: Verificar que el usuario esté activo
  if (!user.activo) {
    throw new Error('Usuario desactivado. Contacte al administrador.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Credenciales no válidas');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  const token = jwt.sign(
    {
      usuarioId: user.id,
      institucionId: user.institucionId,
      rol: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Retornar usuario completo y token
  return {
    token,
    debeCambiarPassword: user.debeCambiarPassword,
    user: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      username: user.username,
      role: user.role,
      institucionId: user.institucionId,
      fotoUrl: user.fotoUrl,
    },
  };
};

export const forgotPassword = async (identificador: string) => {
  // Buscar por email O username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identificador },
        { username: identificador }
      ]
    }
  });

  // Security: Always return success even if user not found to prevent email enumeration
  if (!user) {
    return;
  }

  // SEGURIDAD: No enviar reset si el usuario está desactivado
  if (!user.activo) {
    return;
  }

  // Verificar si el usuario tiene email registrado
  if (!user.email) {
    throw new Error('NO_EMAIL: Este usuario no tiene email registrado. Contacte al Director para resetear su clave manualmente.');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  // Generate Reset Token (8 hours)
  const resetToken = jwt.sign(
    { id: user.id, type: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(user.email, link);
};

export const resetPassword = async (token: string, newPassword: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; type: string };

    if (decoded.type !== 'reset') {
      throw new Error('Token inválido');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // SEGURIDAD: Verificar que el usuario esté activo
    if (!user.activo) {
      throw new Error('Usuario desactivado. Contacte al administrador.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        debeCambiarPassword: false,
      },
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Usuario desactivado')) {
      throw error;
    }
    throw new Error('Token inválido o expirado');
  }
};

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const { currentPassword, newPassword } = input;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar que el usuario esté activo
  if (!user.activo) {
    throw new Error('Usuario desactivado. Contacte al administrador.');
  }

  // Verificar contraseña actual
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new Error('Contraseña actual incorrecta');
  }

  // Hash de la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Actualizar contraseña y marcar que ya no debe cambiarla
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      debeCambiarPassword: false,
    },
  });

  return { message: 'Contraseña actualizada correctamente' };
};

export const manualResetPassword = async (adminUserId: string, targetUserId: string) => {
  // Verificar que el admin tenga permisos
  const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
  if (!adminUser || (adminUser.role !== Role.ADMIN && adminUser.role !== Role.DIRECTOR)) {
    throw new Error('No tiene permisos para realizar esta acción');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new Error('Usuario no encontrado');
  }

  // Si es DIRECTOR, solo puede resetear usuarios de su institución
  if (adminUser.role === Role.DIRECTOR && adminUser.institucionId !== targetUser.institucionId) {
    throw new Error('Solo puede resetear contraseñas de usuarios de su institución');
  }

  // Generar nueva contraseña temporal
  const tempPassword = generateSecurePassword();
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
