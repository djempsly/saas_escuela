import { Worker, Job } from 'bullmq';
import ExcelJS from 'exceljs';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import { getSabanaByNivel, getNivelesParaSabana } from '../services/sabana';
import { uploadBufferToS3 } from '../services/s3.service';
import { emitirNotificacion } from '../services/socket-emitter.service';
import { buildSabanaSheet } from './exportar-excel.worker';
import type { ExportarTodoJobData, ExportarTodoJobResult } from '../queues/types';

async function processor(job: Job<ExportarTodoJobData>): Promise<ExportarTodoJobResult> {
  const { cicloLectivoId, institucionId, userId } = job.data;

  // 1. Obtener todos los niveles de la institución
  const niveles = await getNivelesParaSabana(institucionId, userId, 'DIRECTOR');
  if (!niveles || niveles.length === 0) {
    throw new Error('No se encontraron niveles para esta institución');
  }

  await job.updateProgress(10);

  // 2. Construir workbook con una hoja por nivel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHAMS';
  workbook.created = new Date();

  const progressPerNivel = 70 / niveles.length;
  let processedCount = 0;

  for (const nivel of niveles) {
    const nivelId = (nivel as { id: string }).id;
    try {
      const sabana = await getSabanaByNivel(nivelId, cicloLectivoId, institucionId, undefined, 1, 10000);
      if (sabana.estudiantes.length > 0) {
        buildSabanaSheet(workbook, sabana);
      }
    } catch (err) {
      logger.warn({ err, nivelId }, 'Error obteniendo sábana para nivel, se omite');
    }
    processedCount++;
    await job.updateProgress(Math.round(10 + progressPerNivel * processedCount));
  }

  if (workbook.worksheets.length === 0) {
    throw new Error('No se encontraron datos para exportar en ningún nivel');
  }

  // 3. Generar buffer
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await job.updateProgress(90);

  // 4. Subir a S3
  const filename = `sabana-completa-${Date.now()}.xlsx`;
  const url = await uploadBufferToS3(buffer, filename, 'exports', institucionId);
  await job.updateProgress(100);

  // 5. Notificar
  emitirNotificacion(userId, {
    tipo: 'job:completado',
    titulo: 'Exportación completa lista',
    mensaje: `Se exportaron ${workbook.worksheets.length} niveles en un solo archivo Excel`,
    data: { jobId: job.id, url },
    timestamp: new Date().toISOString(),
  });

  return { url, totalNiveles: workbook.worksheets.length };
}

export const exportarTodoWorker = new Worker<ExportarTodoJobData, ExportarTodoJobResult>(
  QUEUE_NAMES.EXPORTAR_TODO,
  processor,
  { connection: bullmqConnection, concurrency: 1 },
);

exportarTodoWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, result: job.returnvalue }, 'Job exportar-todo completado');
});

exportarTodoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job exportar-todo fallido');
  if (job?.data.userId) {
    emitirNotificacion(job.data.userId, {
      tipo: 'job:fallido',
      titulo: 'Error exportando sábanas',
      mensaje: 'Ocurrió un error al exportar todas las sábanas. Por favor intente nuevamente.',
      data: { jobId: job.id },
      timestamp: new Date().toISOString(),
    });
  }
});
