import { Worker, Job } from 'bullmq';
import xlsx from 'xlsx';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import { getSabanaByNivel } from '../services/sabana';
import { uploadBufferToS3 } from '../services/s3.service';
import { emitirNotificacion } from '../services/socket-emitter.service';
import type { ExportarExcelJobData, ExportarExcelJobResult } from '../queues/types';

async function processor(job: Job<ExportarExcelJobData>): Promise<ExportarExcelJobResult> {
  const { nivelId, cicloLectivoId, institucionId, userId } = job.data;

  // 1. Obtener toda la data de la sabana (sin paginacion — hasta 10000 estudiantes)
  const sabana = await getSabanaByNivel(nivelId, cicloLectivoId, institucionId, undefined, 1, 10000);

  await job.updateProgress(30);

  // 2. Transformar a filas planas para Excel
  const rows = sabana.estudiantes.map((est) => {
    const row: Record<string, string | number | null> = {
      Nombre: est.nombre,
      Apellido: est.apellido,
    };

    for (const materia of sabana.materias) {
      const cal = est.calificaciones[materia.id];
      if (cal) {
        row[`${materia.nombre} P1`] = cal.p1;
        row[`${materia.nombre} P2`] = cal.p2;
        row[`${materia.nombre} P3`] = cal.p3;
        row[`${materia.nombre} P4`] = cal.p4;
        row[`${materia.nombre} Promedio`] = cal.promedioFinal;
        row[`${materia.nombre} Situacion`] = cal.situacion;
      }
    }

    return row;
  });

  await job.updateProgress(50);

  // 3. Construir workbook
  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sabana.nivel.nombre.substring(0, 31));
  const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  await job.updateProgress(80);

  // 4. Subir a S3
  const filename = `sabana-${nivelId}-${Date.now()}.xlsx`;
  const url = await uploadBufferToS3(excelBuffer, filename, 'recursos', institucionId);

  await job.updateProgress(100);

  // 5. Notificar al usuario via socket
  emitirNotificacion(userId, {
    tipo: 'job:completado',
    titulo: 'Exportación Excel lista',
    mensaje: `La sábana de notas ha sido exportada exitosamente`,
    data: { jobId: job.id, url },
    timestamp: new Date().toISOString(),
  });

  return { url };
}

export const excelWorker = new Worker<ExportarExcelJobData, ExportarExcelJobResult>(
  QUEUE_NAMES.EXPORTAR_EXCEL,
  processor,
  { connection: bullmqConnection, concurrency: 1 },
);

excelWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, result: job.returnvalue }, 'Job exportar-excel completado');
});

excelWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job exportar-excel fallido');
  if (job?.data.userId) {
    emitirNotificacion(job.data.userId, {
      tipo: 'job:fallido',
      titulo: 'Error exportando Excel',
      mensaje: 'Ocurrió un error al exportar la sábana. Por favor intente nuevamente.',
      data: { jobId: job.id },
      timestamp: new Date().toISOString(),
    });
  }
});
