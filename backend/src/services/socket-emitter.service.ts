import { getIO } from '../config/socket';
import { logger } from '../config/logger';

export interface SocketNotificacion {
  tipo: string;
  titulo: string;
  mensaje: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Emit a notification to a specific user's room.
 * Fire-and-forget: never throws.
 */
export function emitirNotificacion(
  usuarioId: string,
  notificacion: SocketNotificacion,
): void {
  try {
    const io = getIO();
    io.to(`user:${usuarioId}`).emit('notificacion:nueva', notificacion);
  } catch (err) {
    logger.error({ err, usuarioId }, 'Error emitiendo notificacion socket');
  }
}

/**
 * Emit a notification to multiple users.
 * Fire-and-forget: never throws.
 */
export function emitirNotificacionMasiva(
  usuarioIds: string[],
  notificacion: SocketNotificacion,
): void {
  try {
    const io = getIO();
    for (const userId of usuarioIds) {
      io.to(`user:${userId}`).emit('notificacion:nueva', notificacion);
    }
  } catch (err) {
    logger.error({ err }, 'Error emitiendo notificaciones socket masivas');
  }
}

/**
 * Emit an event to all connected users in an institution.
 * Fire-and-forget: never throws.
 */
export function emitirAInstitucion(
  institucionId: string,
  evento: string,
  data: Record<string, unknown>,
): void {
  try {
    const io = getIO();
    io.to(`inst:${institucionId}`).emit(evento, data);
  } catch (err) {
    logger.error({ err, institucionId, evento }, 'Error emitiendo evento a institucion');
  }
}

/**
 * Emit a new message event to conversation participants (excluding sender).
 * Fire-and-forget: never throws.
 */
export function emitirMensajeNuevo(
  participanteIds: string[],
  remitenteId: string,
  conversacionId: string,
  mensaje: Record<string, unknown>,
): void {
  try {
    const io = getIO();
    for (const userId of participanteIds) {
      if (userId !== remitenteId) {
        io.to(`user:${userId}`).emit('mensaje:nuevo', {
          conversacionId,
          mensaje,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    logger.error({ err, conversacionId }, 'Error emitiendo mensaje socket');
  }
}
