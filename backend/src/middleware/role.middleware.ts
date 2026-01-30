import { Request, Response, NextFunction } from 'express';
import { ROLES } from '../utils/zod.schemas';

type Role = keyof typeof ROLES;

export const roleMiddleware = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userRole = req.user.rol as Role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'No tienes permisos para acceder a este recurso' });
    }

    next();
  };
};
