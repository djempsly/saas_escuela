import { suscripcionesQueue } from '../queues';
import { logger } from '../config/logger';

export async function iniciarJobVerificacionSuscripciones() {
  try {
    await suscripcionesQueue.upsertJobScheduler(
      'verificar-suscripciones-diario',
      { every: 24 * 60 * 60 * 1000 },
      { data: { triggeredAt: new Date().toISOString() } },
    );
    logger.info('Job verificar-suscripciones programado (cada 24h)');
  } catch (err) {
    logger.error({ err }, 'Error al programar job verificar-suscripciones');
  }
}
