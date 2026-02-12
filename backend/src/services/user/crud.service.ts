import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../../config/db';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { CrearUsuarioInput } from '../../utils/zod.schemas';
import { generateSecurePassword, generateUsername } from '../../utils/security';

/**
 * Genera contraseña por defecto basada en el rol del usuario
 */
const getDefaultPasswordByRole = (rol: string): string => {
  const passwordMap: Record<string, string> = {
    ESTUDIANTE: 'estudiante123',
    DOCENTE: 'docente123',
    COORDINADOR: 'coordinador123',
    COORDINADOR_ACADEMICO: 'academico123',
    SECRETARIA: 'secretaria123',
    DIRECTOR: 'director123',
    ADMIN: 'admin123',
  };
  return passwordMap[rol] || 'usuario123';
};

export const createUser = async (input: CrearUsuarioInput, institucionId: string | null) => {
  const { email, nombre, segundoNombre, apellido, segundoApellido, rol } = input;

  if (email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('El correo electrónico ya está en uso');
    }
  }

  const tempPassword = getDefaultPasswordByRole(rol);
  const hashedPassword = await bcrypt.hash(tempPassword, 12);
  // Username: primer nombre + primer apellido + 4 dígitos
  const username = generateUsername(nombre, apellido);

  const user = await prisma.user.create({
    data: {
      nombre,
      segundoNombre: segundoNombre || null,
      apellido,
      segundoApellido: segundoApellido || null,
      username,
      email: email || null,
      password: hashedPassword,
      // SEGURIDAD: No guardar passwordTemporal - se devuelve solo en la respuesta
      role: rol as Role,
      institucionId: institucionId || null,
      debeCambiarPassword: true,
    },
  });

  return { user, tempPassword };
};

export const resetUserPasswordManual = async (
  targetUserId: string,
  requester: { id: string; institucionId: string | null; role: string },
) => {
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

  if (!targetUser) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // SEGURIDAD: Verificar que el usuario objetivo esté activo
  if (!targetUser.activo) {
    throw new ValidationError('No se puede resetear la contraseña de un usuario desactivado');
  }

  // 1. Multi-tenant Check: Must be in same institution (unless Requester is ADMIN)
  if (requester.role !== Role.ADMIN) {
    if (targetUser.institucionId !== requester.institucionId) {
      throw new ForbiddenError('No tienes permisos para gestionar este usuario (Institución distinta)');
    }
  }

  // 2. Hierarchy Check - ADMIN
  if (requester.role === Role.ADMIN) {
    // ADMIN no puede resetear a otro ADMIN (para evitar escalación)
    if (targetUser.role === Role.ADMIN && targetUser.id !== requester.id) {
      throw new ForbiddenError('No tienes permisos para resetear la contraseña de otro administrador');
    }
  }

  // 3. Hierarchy Check - DIRECTOR
  if (requester.role === Role.DIRECTOR) {
    if (targetUser.role === Role.ADMIN || targetUser.role === Role.DIRECTOR) {
      throw new ForbiddenError('No tienes permisos para resetear la contraseña de este usuario (Jerarquía)');
    }
  }

  // 4. Hierarchy Check - SECRETARIA (usando enum para consistencia)
  if (requester.role === Role.SECRETARIA) {
    const privilegedRoles: Role[] = [
      Role.ADMIN,
      Role.DIRECTOR,
      Role.COORDINADOR,
      Role.COORDINADOR_ACADEMICO,
    ];
    if (privilegedRoles.includes(targetUser.role)) {
      throw new ForbiddenError('No tienes permisos para resetear la contraseña de personal directivo');
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
      // SEGURIDAD: No guardar passwordTemporal - se devuelve solo en la respuesta
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
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      institucionId: true,
      createdAt: true,
    },
  });
};

export const findUsersByInstitucion = async (
  institucionId: string,
  role?: string,
  _includePasswordTemporal: boolean = false,
  nivelId?: string,
) => {
  // SEGURIDAD: passwordTemporal ya no existe en el schema
  return prisma.user.findMany({
    where: {
      institucionId,
      ...(role && { role: role as Role }),
      // Filtrar por nivel si se proporciona y es rol ESTUDIANTE
      ...(nivelId &&
        (role === Role.ESTUDIANTE || !role) && {
          inscripciones: {
            some: {
              clase: {
                nivelId: nivelId,
              },
            },
          },
        }),
    },
    select: {
      id: true,
      nombre: true,
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
      debeCambiarPassword: true,
      createdAt: true,
      // Incluir nivel a través de inscripciones para estudiantes
      ...(role === Role.ESTUDIANTE && {
        inscripciones: {
          take: 1,
          select: {
            clase: {
              select: {
                nivel: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
          },
        },
      }),
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const findStudentsByDocente = async (docenteId: string, institucionId: string) => {
  // Find all classes taught by this teacher in the institution
  const clases = await prisma.clase.findMany({
    where: {
      docenteId,
      institucionId,
    },
    select: { id: true },
  });

  const claseIds = clases.map((c) => c.id);

  if (claseIds.length === 0) {
    return [];
  }

  // Find all students enrolled in these classes
  // We use findMany on User directly to get unique students easily using where condition
  return prisma.user.findMany({
    where: {
      institucionId,
      role: Role.ESTUDIANTE,
      inscripciones: {
        some: {
          claseId: { in: claseIds },
        },
      },
    },
    select: {
      id: true,
      nombre: true,
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
      createdAt: true,
    },
    orderBy: { apellido: 'asc' },
  });
};

export const findStaffByInstitucion = async (
  institucionId: string,
  _includePasswordTemporal: boolean = false,
) => {
  // SEGURIDAD: passwordTemporal ya no existe en el schema
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
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
      debeCambiarPassword: true,
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { apellido: 'asc' }, { nombre: 'asc' }],
  });
};

export const updateUserProfile = async (
  userId: string,
  data: {
    nombre?: string;
    segundoNombre?: string;
    apellido?: string;
    segundoApellido?: string;
    email?: string;
    fotoUrl?: string;
  },
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
      throw new ConflictError('El correo electrónico ya está en uso');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.segundoNombre !== undefined && { segundoNombre: data.segundoNombre || null }),
      ...(data.apellido && { apellido: data.apellido }),
      ...(data.segundoApellido !== undefined && { segundoApellido: data.segundoApellido || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.fotoUrl !== undefined && { fotoUrl: data.fotoUrl }),
    },
    select: {
      id: true,
      nombre: true,
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
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
  data: {
    nombre?: string;
    segundoNombre?: string;
    apellido?: string;
    segundoApellido?: string;
    email?: string;
    activo?: boolean;
  },
  requesterInstitucionId: string | null,
  requesterRole: string,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Verificar permisos multi-tenant
  if (requesterRole !== Role.ADMIN && user.institucionId !== requesterInstitucionId) {
    throw new ForbiddenError('No tienes permisos para modificar este usuario');
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
      throw new ConflictError('El correo electrónico ya está en uso');
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.nombre && { nombre: data.nombre }),
      ...(data.segundoNombre !== undefined && { segundoNombre: data.segundoNombre || null }),
      ...(data.apellido && { apellido: data.apellido }),
      ...(data.segundoApellido !== undefined && { segundoApellido: data.segundoApellido || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
    select: {
      id: true,
      nombre: true,
      segundoNombre: true,
      apellido: true,
      segundoApellido: true,
      email: true,
      username: true,
      role: true,
      activo: true,
      fotoUrl: true,
    },
  });
};
