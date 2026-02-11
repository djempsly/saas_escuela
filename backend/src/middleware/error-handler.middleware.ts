import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { isProd } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../errors';
import * as Sentry from '@sentry/node';

/**
 * Error handler global centralizado.
 *
 * Maneja diferentes tipos de errores y retorna respuestas apropiadas:
 * - Errores de Prisma (DB)
 * - Errores de Zod (validación)
 * - Errores de aplicación (AppError y subclases)
 * - [Legacy] Errores de negocio por string matching
 * - Errores inesperados
 *
 * Debe registrarse al final de app.ts:
 * ```typescript
 * app.use(errorHandler);
 * ```
 */
export const errorHandler = (
  err: Error | Prisma.PrismaClientKnownRequestError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  // Log del error para debugging
  const log = req.log || logger;
  log.error({ err, action: 'error_handler', method: req.method, path: req.path }, err.message);

  // =========================
  // Errores de Prisma (DB)
  // =========================
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      // Violación de constraint único (ej: email duplicado)
      case 'P2002': {
        const target = (err.meta?.target as string[]) || ['campo'];
        return res.status(409).json({
          error: 'El registro ya existe',
          details: isProd ? undefined : `Campo duplicado: ${target.join(', ')}`,
        });
      }

      // Registro no encontrado para update/delete
      case 'P2025':
        return res.status(404).json({
          error: 'Registro no encontrado',
          details: isProd ? undefined : err.message,
        });

      // Violación de constraint de foreign key
      case 'P2003':
        return res.status(400).json({
          error: 'Referencia inválida - el registro relacionado no existe',
          details: isProd ? undefined : err.message,
        });

      // Violación de constraint NOT NULL
      case 'P2011':
        return res.status(400).json({
          error: 'Campo requerido faltante',
          details: isProd ? undefined : err.message,
        });

      // Datos inválidos para el tipo de campo
      case 'P2006':
        return res.status(400).json({
          error: 'Datos inválidos para el campo',
          details: isProd ? undefined : err.message,
        });

      // Otros errores de Prisma
      default:
        log.error({ err, prismaCode: err.code }, 'Prisma error no manejado');
        return res.status(500).json({
          error: 'Error de base de datos',
          details: isProd ? undefined : `${err.code}: ${err.message}`,
        });
    }
  }

  // Timeout de Prisma
  if (err instanceof Prisma.PrismaClientInitializationError) {
    log.error({ err }, 'Prisma initialization error');
    return res.status(503).json({
      error: 'Servicio no disponible - error de conexión a base de datos',
    });
  }

  // Errores de validación de Prisma
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Error de validación de datos',
      details: isProd ? undefined : err.message,
    });
  }

  // =========================
  // Errores de Zod (validación)
  // =========================
  if (err instanceof ZodError) {
    const errors = err.flatten();
    return res.status(400).json({
      error: 'Error de validación',
      details: {
        fieldErrors: errors.fieldErrors,
        formErrors: errors.formErrors,
      },
    });
  }

  // =========================
  // Error de CORS
  // =========================
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido' });
  }

  // =========================
  // Errores de aplicación (AppError y subclases)
  // =========================
  if (err instanceof AppError) {
    if (!err.isOperational) {
      log.error({ err }, 'Non-operational error');
      Sentry.captureException(err);
    }
    return res.status(err.statusCode).json({
      error: err.isOperational ? err.message : isProd ? 'Error interno del servidor' : err.message,
    });
  }

  // =========================
  // Errores CRÍTICOS (JWT_SECRET, etc.)
  // =========================
  if (err.message.startsWith('CRITICAL:')) {
    log.fatal({ err }, 'Critical error');
    Sentry.captureException(err);
    return res.status(500).json({
      error: isProd ? 'Error interno del servidor' : err.message,
    });
  }

  // =========================
  // [LEGACY] Errores de negocio por string matching
  // TODO: Migrar servicios para usar AppError subclases y eliminar este bloque
  // =========================
  const knownErrors = [
    'Credenciales no válidas',
    'Usuario desactivado',
    'Usuario no encontrado',
    'No tiene permisos',
    'Token inválido',
    'El enlace de reseteo ha expirado',
    'Institución no encontrada',
    'Clase no encontrada',
    'Estudiante no encontrado',
    'El correo electrónico ya está en uso',
    'Ya existe un administrador',
  ];

  const isKnownError = knownErrors.some((msg) =>
    err.message.toLowerCase().includes(msg.toLowerCase()),
  );

  if (isKnownError) {
    // Determinar status code basado en el tipo de error
    let status = 400;
    if (err.message.includes('no válidas') || err.message.includes('inválido')) {
      status = 401;
    } else if (err.message.includes('no tiene permisos')) {
      status = 403;
    } else if (err.message.includes('no encontrad')) {
      status = 404;
    } else if (err.message.includes('ya está en uso') || err.message.includes('Ya existe')) {
      status = 409;
    }

    return res.status(status).json({ error: err.message });
  }

  // =========================
  // Errores inesperados
  // =========================
  // En producción, ocultar detalles. En desarrollo, mostrar todo.
  if (isProd) {
    return res.status(500).json({
      error: 'Error interno del servidor',
    });
  }

  return res.status(500).json({
    error: err.message || 'Error interno del servidor',
    stack: err.stack,
  });
};
