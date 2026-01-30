import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CrearUsuarioInput } from '../utils/zod.schemas';

const prisma = new PrismaClient();

export const createUser = async (input: CrearUsuarioInput, institucionId: string) => {
  const { email, password, nombre, apellido, rol } = input;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('El correo electrónico ya está en uso');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      nombre,
      apellido,
      username: email, // Use email as username
      email,
      password: hashedPassword,
      role: rol as Role,
      institucionId,
    },
  });

  return user;
};

export const resetUserPasswordManual = async (targetUserId: string, requester: { id: string; institucionId: string | null; role: string }) => {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!targetUser) {
    throw new Error('Usuario no encontrado');
  }

  // 1. Multi-tenant Check: Must be in same institution (unless Requester is ADMIN)
  if (requester.role !== Role.ADMIN) {
    if (targetUser.institucionId !== requester.institucionId) {
      throw new Error('No tienes permisos para gestionar este usuario (Institución distinta)');
    }
  }

  // 2. Hierarchy Check
  if (requester.role === Role.DIRECTOR) {
    if (targetUser.role === Role.ADMIN || targetUser.role === Role.DIRECTOR) {
      throw new Error('No tienes permisos para resetear la contraseña de este usuario (Jerarquía)');
    }
  }

  if (requester.role === 'SECRETARIA') { // Assuming SECRETARIA role string from previous prompt context if exists in Prisma
     // Check if target is Admin or Director or Coordinator
     if ([Role.ADMIN, Role.DIRECTOR, Role.COORDINADOR, Role.COORDINADOR_ACADEMICO].includes(targetUser.role)) {
         throw new Error('No tienes permisos para resetear la contraseña de personal directivo');
     }
  }

  // 3. Generate Temp Password
  const tempPassword = Math.random().toString(36).slice(-8); // Simple random string

  // 4. Update User
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: hashedPassword,
      debeCambiarPassword: true,
    },
  });

  return { tempPassword };
};