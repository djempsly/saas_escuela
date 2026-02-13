import { Worker, Job } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import prisma from '../config/db';
import { crearNotificacionesMasivas } from '../services/notificacion.service';
import { emitirNotificacion } from '../services/socket-emitter.service';
import type { VerificarSuscripcionesJobData, VerificarSuscripcionesJobResult } from '../queues/types';

async function processor(
  job: Job<VerificarSuscripcionesJobData>,
): Promise<VerificarSuscripcionesJobResult> {
  const now = new Date();

  // Buscar suscripciones vencidas cuyo periodo de gracia ya expiró
  const suscripcionesExpiradas = await prisma.suscripcion.findMany({
    where: {
      estado: 'VENCIDA',
      periodoGracia: { lt: now },
    },
  });

  let suspendidas = 0;

  for (const suscripcion of suscripcionesExpiradas) {
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { estado: 'SUSPENDIDA' },
    });

    // Notificar al director
    const institucion = await prisma.institucion.findUnique({
      where: { id: suscripcion.institucionId },
      select: { directorId: true },
    });

    if (institucion) {
      const titulo = 'Suscripción suspendida';
      const mensaje =
        'Su suscripción ha sido suspendida por falta de pago. Por favor, actualice su método de pago para restaurar el servicio.';

      await crearNotificacionesMasivas([institucion.directorId], titulo, mensaje);
      emitirNotificacion(institucion.directorId, {
        tipo: 'suscripcion',
        titulo,
        mensaje,
        timestamp: new Date().toISOString(),
      });
    }

    suspendidas++;
    await job.updateProgress(Math.round((suspendidas / suscripcionesExpiradas.length) * 100));
  }

  return { suspendidas, vencidas: suscripcionesExpiradas.length };
}

export const suscripcionesWorker = new Worker<
  VerificarSuscripcionesJobData,
  VerificarSuscripcionesJobResult
>(QUEUE_NAMES.VERIFICAR_SUSCRIPCIONES, processor, {
  connection: bullmqConnection,
  concurrency: 1,
});

suscripcionesWorker.on('completed', (job) => {
  logger.info(
    { jobId: job.id, result: job.returnvalue },
    'Job verificar-suscripciones completado',
  );
});

suscripcionesWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job verificar-suscripciones fallido');
});
