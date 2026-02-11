import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Rate limiter para endpoints de login (por IP)
 * Limita a 50 intentos por IP cada 15 minutos
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 intentos (aumentado para desarrollo)
  message: {
    message: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar intentos exitosos
});

/**
 * Rate limiter para login por identificador (email/username)
 * Previene fuerza bruta contra una cuenta específica
 * 10 intentos por cuenta cada 15 minutos
 */
export const loginByIdentifierLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: {
    message: 'Demasiados intentos para esta cuenta. Por favor, intente de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const identificador = req.body?.identificador || 'unknown';
    return `login:${String(identificador).toLowerCase()}`;
  },
});

/**
 * Rate limiter por userId para endpoints autenticados
 * 5 intentos por usuario cada hora
 */
export const changePasswordByUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    message: 'Demasiados intentos de cambio de contraseña. Por favor, intente de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.user?.usuarioId || ipKeyGenerator(req.ip ?? 'unknown');
    return `change-pwd:${userId}`;
  },
});

/**
 * Rate limiter por userId para inscripciones
 * 20 inscripciones por usuario cada 15 minutos
 */
export const inscripcionByUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: {
    message: 'Demasiadas solicitudes de inscripción. Por favor, intente de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.user?.usuarioId || ipKeyGenerator(req.ip ?? 'unknown');
    return `inscripcion:${userId}`;
  },
});

/**
 * Rate limiter para endpoints de forgot password
 * Limita a 3 solicitudes por IP cada hora
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 solicitudes
  message: {
    message:
      'Demasiadas solicitudes de recuperación de contraseña. Por favor, intente de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para endpoints de reset password
 * Limita a 5 solicitudes por IP cada hora
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 solicitudes
  message: {
    message: 'Demasiados intentos de cambio de contraseña. Por favor, intente de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para endpoint de registro de SuperAdmin
 * Muy restrictivo: 2 intentos por día por IP
 */
export const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 2, // máximo 2 intentos
  message: {
    message: 'Demasiados intentos de registro. Por favor, contacte al soporte técnico.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter general para API
 * Limita a 100 requests por minuto por IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests
  message: {
    message: 'Demasiadas solicitudes. Por favor, intente de nuevo en un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para cambio de contraseña
 * Limita a 5 intentos por hora por IP
 */
export const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 solicitudes
  message: {
    message: 'Demasiados intentos de cambio de contraseña. Por favor, intente de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
