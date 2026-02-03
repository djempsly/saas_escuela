import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware genérico de validación con Zod.
 *
 * Valida req.body, req.query y req.params según el schema proporcionado.
 * Retorna 400 con errores detallados si la validación falla.
 *
 * @param schema - Schema de Zod que debe incluir body, query o params
 *
 * @example
 * ```typescript
 * // En tus rutas:
 * router.post('/users', validate(crearUsuarioSchema), createUserHandler);
 *
 * // El schema debe tener esta estructura:
 * const crearUsuarioSchema = z.object({
 *   body: z.object({
 *     nombre: z.string().min(1),
 *     email: z.string().email(),
 *   }),
 *   // query y params son opcionales
 * });
 * ```
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.flatten();

      return res.status(400).json({
        error: 'Error de validación',
        details: {
          fieldErrors: errors.fieldErrors,
          formErrors: errors.formErrors,
        },
      });
    }

    // Asignar datos validados de vuelta al request
    // Esto asegura que los tipos estén correctos (ej: coerce.date())
    const data = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (data.body) req.body = data.body;
    if (data.query) req.query = data.query as typeof req.query;
    if (data.params) req.params = data.params as typeof req.params;

    next();
  };
};

/**
 * Versión async del middleware de validación.
 * Útil cuando el schema tiene validaciones async (ej: refine con DB check).
 */
export const validateAsync = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.flatten();

        return res.status(400).json({
          error: 'Error de validación',
          details: {
            fieldErrors: errors.fieldErrors,
            formErrors: errors.formErrors,
          },
        });
      }

      const data = result.data as { body?: unknown; query?: unknown; params?: unknown };
      if (data.body) req.body = data.body;
      if (data.query) req.query = data.query as typeof req.query;
      if (data.params) req.params = data.params as typeof req.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};
