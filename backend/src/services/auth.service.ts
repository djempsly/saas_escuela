import crypto from 'crypto';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import prisma from '../config/db';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../errors';
import { LoginInput, ChangePasswordInput } from '../utils/zod.schemas';
import { generateSecurePassword, generateUsername } from '../utils/security';
import { sendPasswordResetEmail } from './email.service';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const createRefreshToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

interface RegisterSuperAdminInput {
  nombre: string;
  apellido: string;
  email: string;
}

export const registerSuperAdmin = async (input: RegisterSuperAdminInput) => {
  const { email, nombre, apellido } = input;

  // SEGURIDAD: Verificar que no existan ADMINs previos
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (existingAdmin) {
    throw new ConflictError(
      'Ya existe un administrador en el sistema. Contacte al administrador existente.',
    );
  }

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('El correo electrónico ya está en uso');
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
  const { identificador, password, slug } = input;

  // OPTIMIZACIÓN: Una sola query con include de institución
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identificador }, { username: identificador }],
    },
    include: {
      institucion: {
        select: { id: true, slug: true, nombre: true, activo: true },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Credenciales no válidas');
  }

  // SEGURIDAD: Verificar que el usuario esté activo
  if (!user.activo) {
    throw new UnauthorizedError('Usuario desactivado. Contacte al administrador.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Credenciales no válidas');
  }

  // SEGURIDAD: Validar contexto de inicio de sesión
  if (slug) {
    // Login desde página de institución: Validar que el usuario pertenezca
    if (user.role !== Role.ADMIN) {
      if (!user.institucion || user.institucion.slug !== slug) {
        throw new UnauthorizedError('Credenciales no válidas para esta institución');
      }
      if (!user.institucion.activo) {
        throw new ValidationError('Esta institución está desactivada. Contacte al administrador.');
      }
    }
  } else {
    // Login global (sin slug): Solo permitido para ADMIN
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenError(
        'Acceso denegado. Estudiantes y personal deben iniciar sesión desde el portal de su institución.',
      );
    }
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  const accessToken = jwt.sign(
    {
      usuarioId: user.id,
      institucionId: user.institucionId,
      rol: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );

  const refreshToken = await createRefreshToken(user.id);

  // Retornar usuario completo y tokens
  return {
    token: accessToken,
    accessToken,
    refreshToken,
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

export const forgotPassword = async (
  identificador: string,
): Promise<{ needsManualReset: boolean }> => {
  // Función helper para simular delay y prevenir timing attacks
  const simulateDelay = async () => {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 300) + 200));
  };

  // Buscar por email O username
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identificador }, { username: identificador }],
    },
  });

  // SEGURIDAD: Todos los caminos que no envían email deben verse iguales desde afuera
  // para prevenir enumeración de usuarios.

  // Usuario no existe
  if (!user) {
    await simulateDelay();
    return { needsManualReset: false };
  }

  // Usuario desactivado
  if (!user.activo) {
    await simulateDelay();
    return { needsManualReset: false };
  }

  // Usuario sin email - NO lanzar error, comportarse igual que los otros casos
  if (!user.email) {
    await simulateDelay();
    // Retornar flag interno para que el controller muestre mensaje genérico
    // pero NUNCA revelar que el usuario existe sin email
    return { needsManualReset: true };
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  // Generate Reset Token (8 hours)
  const resetToken = jwt.sign({ id: user.id, type: 'reset' }, process.env.JWT_SECRET, {
    expiresIn: '8h',
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(user.email, link);
  return { needsManualReset: false };
};

export const resetPassword = async (token: string, newPassword: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  let decoded: { id: string; type: string };

  // 1. Verificar token — solo capturar errores específicos de JWT
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; type: string };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new UnauthorizedError('El enlace de reseteo ha expirado. Solicita uno nuevo.');
    }
    if (error instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Token inválido');
    }
    // Error inesperado — dejarlo propagarse para que el error handler global lo capture
    throw error;
  }

  if (decoded.type !== 'reset') {
    throw new UnauthorizedError('Token inválido');
  }

  // 2. Buscar usuario — errores de DB se propagan naturalmente
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // SEGURIDAD: Verificar que el usuario esté activo
  if (!user.activo) {
    throw new UnauthorizedError('Usuario desactivado. Contacte al administrador.');
  }

  // 3. Actualizar contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      debeCambiarPassword: false,
    },
  });
};

export const changePassword = async (userId: string, input: ChangePasswordInput) => {
  const { currentPassword, newPassword } = input;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Verificar que el usuario esté activo
  if (!user.activo) {
    throw new UnauthorizedError('Usuario desactivado. Contacte al administrador.');
  }

  // Verificar contraseña actual
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ValidationError('Contraseña actual incorrecta');
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

export const refreshAccessToken = async (token: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Buscar el refresh token
    const existing = await tx.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true, institucionId: true, activo: true } } },
    });

    if (!existing || existing.revoked) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    if (existing.expiresAt < new Date()) {
      // Marcar como revocado si expiró
      await tx.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
      throw new UnauthorizedError('Refresh token expirado');
    }

    if (!existing.user.activo) {
      await tx.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });
      throw new UnauthorizedError('Usuario desactivado');
    }

    // 2. Revocar el token viejo
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revoked: true },
    });

    // 3. Crear nuevo refresh token
    const newToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await tx.refreshToken.create({
      data: { token: newToken, userId: existing.userId, expiresAt },
    });

    // 4. Generar nuevo access token
    const accessToken = jwt.sign(
      {
        usuarioId: existing.user.id,
        institucionId: existing.user.institucionId,
        rol: existing.user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return { accessToken, refreshToken: newToken };
  });
};

export const logout = async (token: string) => {
  const existing = await prisma.refreshToken.findUnique({ where: { token } });

  if (!existing || existing.revoked) {
    // Idempotente: no lanzar error si ya no existe o fue revocado
    return;
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revoked: true },
  });
};

export const manualResetPassword = async (adminUserId: string, targetUserId: string) => {
  // Verificar que el admin tenga permisos
  const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
  if (!adminUser || (adminUser.role !== Role.ADMIN && adminUser.role !== Role.DIRECTOR)) {
    throw new ForbiddenError('No tiene permisos para realizar esta acción');
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Si es DIRECTOR, solo puede resetear usuarios de su institución
  if (adminUser.role === Role.DIRECTOR && adminUser.institucionId !== targetUser.institucionId) {
    throw new ForbiddenError('Solo puede resetear contraseñas de usuarios de su institución');
  }

  // Generar nueva contraseña temporal
  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  // SEGURIDAD: NO guardar la contraseña temporal en texto plano
  // Solo se retorna al admin una vez y no se persiste
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: hashedPassword,
      debeCambiarPassword: true,
    },
  });

  return { tempPassword };
};
