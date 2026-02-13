import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';

export const checkSuscripcionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.resolvedInstitucionId) {
    return next();
  }

  if (req.user?.rol === Role.ADMIN) {
    return next();
  }

  const mutantMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutantMethods.includes(req.method)) {
    return next();
  }

  const suscripcion = await prisma.suscripcion.findUnique({
    where: { institucionId: req.resolvedInstitucionId },
    select: { estado: true },
  });

  if (!suscripcion) {
    return next();
  }

  if (suscripcion.estado === 'SUSPENDIDA') {
    return res.status(403).json({
      message: 'Suscripción suspendida. Modo solo lectura.',
    });
  }

  return next();
};
