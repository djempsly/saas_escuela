import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { logger } from '../config/logger';

/**
 * Middleware que resuelve el institucionId correcto para la solicitud.
 *
 * - Para ADMIN: puede especificar institucionId como query param
 * - Para otros roles: usa el institucionId del JWT
 *
 * El institucionId resuelto se almacena en req.resolvedInstitucionId
 */
export const resolveTenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { rol, institucionId: jwtInstitucionId } = req.user;

    // Para ADMIN: puede especificar institucionId como query param o en el body (para peticiones POST)
    if (rol === Role.ADMIN) {
      const queryInstitucionId = (req.query.institucionId as string) || (req.body?.institucionId as string);

      if (queryInstitucionId) {
        // Verificar que la institución existe
        const institucion = await prisma.institucion.findUnique({
          where: { id: queryInstitucionId },
        });

        if (!institucion) {
          return res.status(404).json({ message: 'Institución no encontrada' });
        }

        req.resolvedInstitucionId = queryInstitucionId;
      } else {
        // ADMIN sin especificar institución - depende del endpoint si esto es válido
        req.resolvedInstitucionId = null;
      }
    } else {
      // Para usuarios regulares: usar institucionId del JWT
      if (!jwtInstitucionId) {
        return res.status(403).json({ message: 'Usuario sin institución asignada' });
      }
      req.resolvedInstitucionId = jwtInstitucionId;
    }

    next();
  } catch (error) {
    (req.log || logger).error({ err: error }, 'Error al resolver institución');
    return res.status(500).json({ message: 'Error al resolver institución' });
  }
};

/**
 * Middleware que requiere un institucionId resuelto.
 * Debe usarse después de resolveTenantMiddleware.
 */
export const requireTenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.resolvedInstitucionId) {
    // Para ADMIN sin institución especificada
    if (req.user?.rol === Role.ADMIN) {
      return res.status(400).json({
        message: 'Debe especificar institucionId como query parameter',
        example: `${req.originalUrl}?institucionId=<id>`
      });
    }
    return res.status(403).json({ message: 'No autorizado' });
  }
  next();
};
