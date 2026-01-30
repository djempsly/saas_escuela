import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { LoginInput, CrearUsuarioInput } from '../utils/zod.schemas';
import { sendPasswordResetEmail } from './email.service';

const prisma = new PrismaClient();

export const registerSuperAdmin = async (input: CrearUsuarioInput) => {
  const { email, password, nombre, apellido } = input;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('El correo electrónico ya está en uso');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      nombre,
      apellido,
      username: email,
      email,
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  return user;
};

export const login = async (input: LoginInput) => {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Credenciales no válidas');
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

  return { token };
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  
  // Security: Always return success even if user not found to prevent email enumeration
  if (!user) {
    return;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
  }

  // Generate Reset Token (15 mins)
  const resetToken = jwt.sign(
    { id: user.id, type: 'reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Generate Link
  // Assuming frontend URL is in env or hardcoded for now
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/reset-password?token=${resetToken}`;

  // Send Email
  await sendPasswordResetEmail(email, link);
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        debeCambiarPassword: false, // User set it themselves
      },
    });

  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};
