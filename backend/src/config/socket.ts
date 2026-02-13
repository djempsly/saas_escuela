import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../utils/jwt.payload';
import { isTokenBlacklisted } from '../services/token-blacklist.service';
import { logger } from './logger';

let io: Server | null = null;

/**
 * Initializes the Socket.IO server and attaches it to the existing HTTP server.
 * Must be called once from server.ts after app.listen().
 */
export function initSocketIO(httpServer: HttpServer, allowedOrigins: string[]): Server {
  if (io) {
    logger.warn('Socket.IO ya fue inicializado');
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      },
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // JWT Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Token no proporcionado'));
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return next(new Error('Error de configuracion del servidor'));
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;

      // Check blacklist (fail-open)
      if (decoded.jti) {
        try {
          const blacklisted = await isTokenBlacklisted(decoded.jti);
          if (blacklisted) {
            return next(new Error('Token revocado'));
          }
        } catch {
          // fail-open: if Redis fails, allow connection
        }
      }

      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Token no valido'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.debug({ usuarioId: user.usuarioId }, 'Socket conectado');

    // Join user-specific room
    socket.join(`user:${user.usuarioId}`);

    // Join institution room
    if (user.institucionId) {
      socket.join(`inst:${user.institucionId}`);
    }

    socket.on('disconnect', (reason) => {
      logger.debug({ usuarioId: user.usuarioId, reason }, 'Socket desconectado');
    });
  });

  logger.info('Socket.IO inicializado');
  return io;
}

/**
 * Returns the Socket.IO server instance.
 * Throws if called before initSocketIO().
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado');
  }
  return io;
}

/**
 * Gracefully closes all socket connections.
 */
export async function closeSocketIO(): Promise<void> {
  if (!io) return;
  return new Promise((resolve) => {
    io!.close(() => {
      io = null;
      resolve();
    });
  });
}
