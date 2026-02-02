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
      passwordTemporal: tempPassword, // Guardar contraseña temporal para ADMIN/DIRECTOR
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
      passwordTemporal: tempPassword, // Guardar contraseña temporal
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

export const findUsersByInstitucion = async (institucionId: string, role?: string, includePasswordTemporal: boolean = false) => {
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
      debeCambiarPassword: true,
      passwordTemporal: includePasswordTemporal, // Solo incluir si lo solicita ADMIN/DIRECTOR
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const findStaffByInstitucion = async (institucionId: string, includePasswordTemporal: boolean = false) => {
  const staffRoles: Role[] = [
    Role.COORDINADOR,
    Role.COORDINADOR_ACADEMICO,
    Role.DOCENTE,
    Role.SECRETARIA,
  ];

  return prisma.user.findMany({
    where: {
      institucionId,
      role: { in: staffRoles },
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
      debeCambiarPassword: true,
      passwordTemporal: includePasswordTemporal,
      createdAt: true,
    },
    orderBy: [
      { role: 'asc' },
      { apellido: 'asc' },
      { nombre: 'asc' },
    ],
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

export const getCoordinacionInfo = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: {
          id: true,
          nombre: true,
          niveles: {
            select: { id: true, nombre: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  return {
    nivelesCoordinados: user.coordinadorDe,
    ciclosEducativosCoordinados: user.coordinadorCiclosEducativos,
  };
};

export const findCoordinadores = async (institucionId: string) => {
  return prisma.user.findMany({
    where: {
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO] },
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
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: { id: true, nombre: true },
      },
    },
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
};

export const assignCiclosToCoordinator = async (
  userId: string,
  cicloIds: string[],
  institucionId: string
) => {
  // Verify user exists and is a coordinator
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO] },
    },
  });

  if (!user) {
    throw new Error('Coordinador no encontrado');
  }

  // Verify all ciclos belong to the same institution
  if (cicloIds.length > 0) {
    const ciclos = await prisma.cicloEducativo.findMany({
      where: { id: { in: cicloIds }, institucionId },
    });
    if (ciclos.length !== cicloIds.length) {
      throw new Error('Algunos ciclos educativos no son válidos');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      coordinadorCiclosEducativos: {
        set: cicloIds.map((id) => ({ id })),
      },
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: { id: true, nombre: true },
      },
    },
  });
};

export const assignNivelesToCoordinator = async (
  userId: string,
  nivelIds: string[],
  institucionId: string
) => {
  // Verify user exists and is a coordinator
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      institucionId,
      role: { in: [Role.COORDINADOR, Role.COORDINADOR_ACADEMICO] },
    },
  });

  if (!user) {
    throw new Error('Coordinador no encontrado');
  }

  // First, remove this coordinator from all niveles
  await prisma.nivel.updateMany({
    where: { coordinadorId: userId },
    data: { coordinadorId: null },
  });

  // Then assign the new niveles
  if (nivelIds.length > 0) {
    await prisma.nivel.updateMany({
      where: { id: { in: nivelIds }, institucionId },
      data: { coordinadorId: userId },
    });
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      coordinadorDe: {
        select: { id: true, nombre: true },
      },
      coordinadorCiclosEducativos: {
        select: { id: true, nombre: true },
      },
    },
  });
};
