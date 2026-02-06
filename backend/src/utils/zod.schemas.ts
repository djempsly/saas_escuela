import { z } from 'zod';
import { Role, Pais, SistemaEducativo, TipoMateria, EstadoAsistencia, Idioma } from '@prisma/client';

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
    identificador: z.string().min(1, 'Email o username requerido'),
    password: z.string().min(1, 'Password requerido'),
    slug: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    identificador: z.string().min(1, 'Email o username requerido'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Contraseña actual requerida'),
    newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  }),
});

// Schema específico para registro de Super Admin (setup inicial)
export const registerSuperAdminSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    apellido: z.string().min(1, 'Apellido requerido'),
    email: z.string().email('Email inválido'),
  }),
});

export const institucionSchema = z.object({
  body: z.object({
    nombre: z.string().min(3, 'Nombre requerido'),
    pais: z.nativeEnum(Pais),
    // Sistema principal (requerido para compatibilidad)
    sistemaEducativo: z.nativeEnum(SistemaEducativo),
    // Sistemas adicionales que ofrece la institución (opcional)
    // Permite seleccionar múltiples: inicial, primaria, secundaria, etc.
    sistemasEducativos: z.array(z.nativeEnum(SistemaEducativo)).optional(),
    idiomaPrincipal: z.nativeEnum(Idioma).optional(),
    logo: z.string().optional().nullable(),
    slug: z.string().min(3).optional().nullable(),
    dominioPersonalizado: z.string().optional().nullable(),
    autogestionActividades: z.boolean().optional(),
    colores: z.object({
        primario: z.string(),
        secundario: z.string()
    }).optional(),
    // Opción 1: Usar director existente
    directorId: z.string().optional().nullable(),
    // Opción 2: Crear nuevo director (email ahora es opcional)
    director: z.object({
      nombre: z.string().min(1),
      apellido: z.string().min(1),
      email: z.string().email().optional().nullable().or(z.literal(''))
    }).optional().nullable()
  }).refine(
    (data) => data.directorId || data.director,
    { message: 'Debe proporcionar un director existente (directorId) o datos para crear uno nuevo (director)' }
  ),
});

// --- USER MANAGEMENT ---

export const crearUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(1, 'Primer nombre requerido'),
    segundoNombre: z.string().optional().or(z.literal('')),
    apellido: z.string().min(1, 'Primer apellido requerido'),
    segundoApellido: z.string().optional().or(z.literal('')),
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
    gradoNumero: z.number().int().min(1).max(12).optional(), // Grado numérico (1-12)
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

// --- CLASE (CLASSROOM) ---

export const claseSchema = z.object({
  body: z.object({
    codigo: z.string().min(3, 'Codigo debe tener al menos 3 caracteres').optional(),
    tanda: z.enum(['MATUTINA', 'VESPERTINA', 'NOCTURNA', 'SABATINA', 'EXTENDIDA']).optional(),
    seccion: z.string().max(10).optional(),
    materiaId: z.string().min(1, 'Materia requerida'),
    nivelId: z.string().min(1, 'Nivel requerido'),
    docenteId: z.string().min(1, 'Docente requerido'),
    cicloLectivoId: z.string().min(1, 'Ciclo lectivo requerido'),
  }),
});

// --- INSCRIPCION (ENROLLMENT) ---

export const inscripcionSchema = z.object({
  body: z.object({
    estudianteId: z.string().min(1, 'Estudiante requerido'),
    claseId: z.string().min(1, 'Clase requerida'),
  }),
});

export const inscripcionMasivaSchema = z.object({
  body: z.object({
    claseId: z.string().min(1, 'Clase requerida'),
    estudianteIds: z.array(z.string()).min(1, 'Al menos un estudiante requerido'),
  }),
});

// --- ASISTENCIA (ATTENDANCE) ---

export const tomarAsistenciaSchema = z.object({
  body: z.object({
    claseId: z.string().min(1, 'Clase requerida'),
    fecha: z.coerce.date(),
    asistencias: z.array(z.object({
      estudianteId: z.string().min(1),
      estado: z.nativeEnum(EstadoAsistencia),
    })).min(1, 'Al menos una asistencia requerida'),
  }),
});

export const reporteAsistenciaSchema = z.object({
  query: z.object({
    claseId: z.string().min(1, 'Clase requerida'),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date(),
  }),
});

// --- CALIFICACION (GRADES) ---

export const calificacionSchema = z.object({
  body: z.object({
    estudianteId: z.string().min(1, 'Estudiante requerido'),
    claseId: z.string().min(1, 'Clase requerida'),
    p1: z.number().min(0).max(100).optional(),
    p2: z.number().min(0).max(100).optional(),
    p3: z.number().min(0).max(100).optional(),
    p4: z.number().min(0).max(100).optional(),
    rp1: z.number().min(0).max(100).optional(),
    rp2: z.number().min(0).max(100).optional(),
    rp3: z.number().min(0).max(100).optional(),
    rp4: z.number().min(0).max(100).optional(),
    cpc_30: z.number().min(0).max(30).optional(),
    cpex_70: z.number().min(0).max(70).optional(),
  }),
});

export const calificacionTecnicaSchema = z.object({
  body: z.object({
    estudianteId: z.string().min(1, 'Estudiante requerido'),
    claseId: z.string().min(1, 'Clase requerida'),
    ra_codigo: z.string().min(1, 'Código RA requerido'),
    valor: z.number().min(0).max(100, 'Valor debe estar entre 0 y 100'),
  }),
});

export const calificacionMasivaSchema = z.object({
  body: z.object({
    claseId: z.string().min(1, 'Clase requerida'),
    periodo: z.enum(['p1', 'p2', 'p3', 'p4']),
    calificaciones: z.array(z.object({
      estudianteId: z.string().min(1),
      nota: z.number().min(0).max(100),
    })).min(1),
  }),
});

// --- ACTIVIDAD (ACTIVITIES) ---

export const actividadSchema = z.object({
  body: z.object({
    titulo: z.string().min(1, 'Título requerido').max(200),
    contenido: z.string().min(1, 'Contenido requerido'),
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
export type ClaseInput = z.infer<typeof claseSchema>['body'];
export type InscripcionInput = z.infer<typeof inscripcionSchema>['body'];
export type TomarAsistenciaInput = z.infer<typeof tomarAsistenciaSchema>['body'];
export type CalificacionInput = z.infer<typeof calificacionSchema>['body'];
export type CalificacionTecnicaInput = z.infer<typeof calificacionTecnicaSchema>['body'];
export type ActividadInput = z.infer<typeof actividadSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
