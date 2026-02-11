import rateLimit from 'express-rate-limit';

/**
 * Rate limiter para endpoints de login
 * Limita a 5 intentos por IP cada 15 minutos
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
