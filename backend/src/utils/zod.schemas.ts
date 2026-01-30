import { z } from 'zod';
import { Role, Pais, SistemaEducativo, TipoMateria } from '@prisma/client';

// Re-export Enums as objects to ensure they are available as values and types
export const ROLES = {
  ADMIN: Role.ADMIN,
  DIRECTOR: Role.DIRECTOR,
  DOCENTE: Role.DOCENTE,
  ESTUDIANTE: Role.ESTUDIANTE,
  SECRETARIA: Role.SECRETARIA,
  COORDINADOR: Role.COORDINADOR,
  COORDINADOR_ACADEMICO: Role.COORDINADOR_ACADEMICO
} as const;

export const PAISES = {
  DO: Pais.DO,
  HT: Pais.HT
} as const;

// --- AUTH & SETUP ---

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email no válido'),
    password: z.string().min(1, 'Password requerido'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email no válido'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  }),
});

export const institucionSchema = z.object({
  body: z.object({
    nombre: z.string().min(3, 'Nombre requerido'),
    pais: z.nativeEnum(Pais),
    sistemaEducativo: z.nativeEnum(SistemaEducativo),
    logo: z.string().optional(),
    colores: z.object({
        primario: z.string(),
        secundario: z.string()
    }).optional(),
    director: z.object({
      nombre: z.string().min(1),
      apellido: z.string().min(1),
      email: z.string().email()
    })
  }),
});

// --- USER MANAGEMENT ---

export const crearUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    apellido: z.string().min(1, 'Apellido requerido'),
    email: z.string().email().optional().or(z.literal('')),
    rol: z.nativeEnum(Role),
    institucionId: z.string().optional()
  }),
});

// --- ACADEMIC ---

export const cicloLectivoSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
    activo: z.boolean().optional()
  }).refine(data => data.fechaFin > data.fechaInicio, {
    message: "Fecha fin debe ser mayor a inicio",
    path: ["fechaFin"]
  })
});

export const nivelSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    coordinadorId: z.string().optional()
  }),
});

export const materiaSchema = z.object({
  body: z.object({
    nombre: z.string().min(1),
    descripcion: z.string().optional(),
    tipo: z.nativeEnum(TipoMateria).default('GENERAL')
  }),
});

// --- INFERRED TYPES ---

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type InstitucionInput = z.infer<typeof institucionSchema>['body'];
export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>['body'];
export type CicloLectivoInput = z.infer<typeof cicloLectivoSchema>['body'];
export type NivelInput = z.infer<typeof nivelSchema>['body'];
export type MateriaInput = z.infer<typeof materiaSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
