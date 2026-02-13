import { Worker, Job } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import prisma from '../config/db';
import { crearNotificacionesMasivas } from '../services/notificacion.service';
import { emitirNotificacionMasiva } from '../services/socket-emitter.service';
import type { RecordatorioMantenimientoJobData, RecordatorioMantenimientoJobResult } from '../queues/types';

async function processor(
  job: Job<RecordatorioMantenimientoJobData>,
): Promise<RecordatorioMantenimientoJobResult> {
  const { avisoId, horasAntes } = job.data;

  const aviso = await prisma.avisoMantenimiento.findUnique({ where: { id: avisoId } });

  if (!aviso || !aviso.activo) {
    logger.info({ avisoId }, 'Aviso cancelado o no encontrado, omitiendo recordatorio');
    return { totalNotificados: 0 };
  }

  const directores = await prisma.user.findMany({
    where: { role: 'DIRECTOR', activo: true },
    select: { id: true },
  });

  const directorIds = directores.map((d) => d.id);

  if (directorIds.length === 0) {
    return { totalNotificados: 0 };
  }

  const titulo = `Recordatorio: Mantenimiento en ${horasAntes}h`;
  const mensaje = `El mantenimiento "${aviso.titulo}" comenzara en ${horasAntes} horas. ${aviso.mensaje}`;

  await crearNotificacionesMasivas(directorIds, titulo, mensaje);

  emitirNotificacionMasiva(directorIds, {
    tipo: 'mantenimiento',
    titulo,
    mensaje,
    timestamp: new Date().toISOString(),
  });

  return { totalNotificados: directorIds.length };
}

export const recordatorioMantenimientoWorker = new Worker<
  RecordatorioMantenimientoJobData,
  RecordatorioMantenimientoJobResult
>(QUEUE_NAMES.RECORDATORIO_MANTENIMIENTO, processor, {
  connection: bullmqConnection,
  concurrency: 1,
});

recordatorioMantenimientoWorker.on('completed', (job) => {
  logger.info(
    { jobId: job.id, result: job.returnvalue },
    'Job recordatorio-mantenimiento completado',
  );
});

recordatorioMantenimientoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job recordatorio-mantenimiento fallido');
});
