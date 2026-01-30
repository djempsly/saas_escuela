import { z } from 'zod';

// Enum for user roles
export const ROLES = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  DOCENTE: 'DOCENTE',
  ESTUDIANTE: 'ESTUDIANTE',
  SECRETARIA: 'SECRETARIA',
} as const;

// Enum for countries
export const PAISES = {
  RD: 'RD',
  HT: 'HT',
} as const;

// Schema for Login
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email no válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

// Schema for Institution Registration
export const institucionSchema = z.object({
  body: z.object({
    nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    pais: z.nativeEnum(PAISES, {
      errorMap: () => ({ message: 'País no válido' }),
    }),
    sistemaEducativo: z.string().optional(),
    logo: z.string().url('URL de logo no válida').optional(),
    colores: z
      .object({
        primario: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color primario no válido'),
        secundario: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color secundario no válido'),
      })
      .optional(),
    director: z.object({
      nombre: z.string().min(3, 'El nombre del director es requerido'),
      apellido: z.string().min(3, 'El apellido del director es requerido'),
      email: z.string().email('Email del director no válido'),
      password: z.string().min(6, 'La contraseña del director debe tener al menos 6 caracteres'),
    }),
  }),
});

// Schema for User Creation
export const crearUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    apellido: z.string().min(3, 'El apellido debe tener al menos 3 caracteres'),
    email: z.string().email('Email no válido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    rol: z.nativeEnum(ROLES, {
      errorMap: () => ({ message: 'Rol no válido' }),
    }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type InstitucionInput = z.infer<typeof institucionSchema>['body'];
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>['body'];

// Schema for Forgot Password
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email no válido'),
  }),
});

// Schema for Reset Password (Token based)
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'El token es requerido'),
    newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});
