import { Worker, Job } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import { crearNotificacionesMasivas } from '../services/notificacion.service';
import { emitirNotificacionMasiva } from '../services/socket-emitter.service';
import type { NotificacionesMasivasJobData, NotificacionesMasivasJobResult } from '../queues/types';

const BATCH_SIZE = 50;

async function processor(
  job: Job<NotificacionesMasivasJobData>,
): Promise<NotificacionesMasivasJobResult> {
  const { usuarioIds, titulo, mensaje } = job.data;
  let totalEnviadas = 0;

  for (let i = 0; i < usuarioIds.length; i += BATCH_SIZE) {
    const batch = usuarioIds.slice(i, i + BATCH_SIZE);

    // Crear notificaciones en DB
    await crearNotificacionesMasivas(batch, titulo, mensaje);

    // Emitir via socket
    emitirNotificacionMasiva(batch, {
      tipo: 'notificacion',
      titulo,
      mensaje,
      timestamp: new Date().toISOString(),
    });

    totalEnviadas += batch.length;
    await job.updateProgress(Math.round((totalEnviadas / usuarioIds.length) * 100));
  }

  return { totalEnviadas };
}

export const notificacionesWorker = new Worker<
  NotificacionesMasivasJobData,
  NotificacionesMasivasJobResult
>(QUEUE_NAMES.NOTIFICACIONES_MASIVAS, processor, {
  connection: bullmqConnection,
  concurrency: 1,
});

notificacionesWorker.on('completed', (job) => {
  logger.info(
    { jobId: job.id, result: job.returnvalue },
    'Job notificaciones-masivas completado',
  );
});

notificacionesWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job notificaciones-masivas fallido');
});
