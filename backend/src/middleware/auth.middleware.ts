import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../utils/jwt.payload';
import { isTokenBlacklisted } from '../services/token-blacklist.service';
import '../types/express';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No se proporcionó token o el formato es incorrecto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('CRITICAL: JWT_SECRET no está definido en el servidor.');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

    // Blacklist check (fail-open: si Redis falla, el request pasa)
    if (decoded.jti) {
      const blacklisted = await isTokenBlacklisted(decoded.jti);
      if (blacklisted) {
        return res.status(401).json({ message: 'Token revocado' });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token no válido' });
  }
};
