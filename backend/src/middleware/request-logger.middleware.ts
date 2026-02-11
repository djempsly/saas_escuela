import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  req.requestId = requestId;
  req.log = logger.child({ requestId });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.log.info(
      {
        action: 'request_completed',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.usuarioId,
        institucionId: req.resolvedInstitucionId,
      },
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });

  next();
};
