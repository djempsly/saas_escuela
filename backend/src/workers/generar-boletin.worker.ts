import { Worker, Job } from 'bullmq';
import archiver from 'archiver';
import { Packer } from 'docx';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import { getBoletinesClase } from '../services/boletin-data/boletin-data.service';
import { generarBoletin, BoletinConfig, DatosEstudiante, Calificacion } from '../services/boletin';
import { uploadBufferToS3 } from '../services/s3.service';
import { emitirNotificacion } from '../services/socket-emitter.service';
import type { GenerarBoletinJobData, GenerarBoletinJobResult } from '../queues/types';

async function processor(job: Job<GenerarBoletinJobData>): Promise<GenerarBoletinJobResult> {
  const { claseId, cicloLectivoId, institucionId, userId } = job.data;

  // 1. Obtener datos de todos los estudiantes de la clase
  const boletinesData = await getBoletinesClase(claseId, cicloLectivoId, institucionId);

  if (boletinesData.length === 0) {
    throw new Error('No se encontraron estudiantes con datos para generar boletines');
  }

  // 2. Generar DOCX por cada estudiante
  const docxBuffers: { nombre: string; buffer: Buffer }[] = [];
  for (let i = 0; i < boletinesData.length; i++) {
    const data = boletinesData[i];

    const gradoMap: Record<string, '1er' | '2do' | '3er' | '4to' | '5to' | '6to'> = {
      '1': '1er', '2': '2do', '3': '3er', '4': '4to', '5': '5to', '6': '6to',
    };
    const gradoNum = data.estudiante.grado.match(/(\d)/)?.[1] || '1';
    const grado = gradoMap[gradoNum] || '1er';

    const config: BoletinConfig = {
      grado,
      colorNota: 'FFFFCC',
      colorHeader: 'D5E4AE',
      colorSubheader: 'EAF2D8',
    };

    const datosEstudiante: DatosEstudiante = {
      nombre: `${data.estudiante.nombre} ${data.estudiante.apellido}`,
      seccion: data.estudiante.seccion,
      centroEducativo: data.institucion.nombre,
      codigoCentro: data.institucion.codigoCentro,
      añoEscolarInicio: data.ciclo.fechaInicio.split('-')[0],
      añoEscolarFin: data.ciclo.fechaFin.split('-')[0],
    };

    // Map calificaciones to the boletin generator format
    const calificaciones: Calificacion[] = data.calificaciones.map((cal) => ({
      area: cal.materia,
      comunicativa: {
        p1: cal.periodos.find((p) => p.periodo === 'P1')?.nota ?? undefined,
        p2: cal.periodos.find((p) => p.periodo === 'P2')?.nota ?? undefined,
        p3: cal.periodos.find((p) => p.periodo === 'P3')?.nota ?? undefined,
        p4: cal.periodos.find((p) => p.periodo === 'P4')?.nota ?? undefined,
      },
      pensamientoLogico: {},
      cientifica: {},
      etica: {},
      promedios: {},
      calFinal: cal.promedioFinal,
    }));

    const buffer = await generarBoletin(config, datosEstudiante, calificaciones);

    const nombreArchivo = `boletin_${data.estudiante.nombre}_${data.estudiante.apellido}.docx`
      .replace(/\s+/g, '_')
      .toLowerCase();
    docxBuffers.push({ nombre: nombreArchivo, buffer });

    await job.updateProgress(Math.round(((i + 1) / boletinesData.length) * 80));
  }

  // 3. Empaquetar en ZIP
  const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const { nombre, buffer } of docxBuffers) {
      archive.append(buffer, { name: nombre });
    }
    archive.finalize();
  });

  await job.updateProgress(90);

  // 4. Subir ZIP a S3 (carpeta exports: URL directa, sin proxy de signed URLs)
  const filename = `boletines-${claseId}-${Date.now()}.zip`;
  const url = await uploadBufferToS3(zipBuffer, filename, 'exports', institucionId);

  await job.updateProgress(100);

  // 5. Notificar al usuario via socket
  emitirNotificacion(userId, {
    tipo: 'job:completado',
    titulo: 'Boletines generados',
    mensaje: `Se generaron ${docxBuffers.length} boletines exitosamente`,
    data: { jobId: job.id, url, totalBoletines: docxBuffers.length },
    timestamp: new Date().toISOString(),
  });

  return { url, totalBoletines: docxBuffers.length };
}

export const boletinWorker = new Worker<GenerarBoletinJobData, GenerarBoletinJobResult>(
  QUEUE_NAMES.GENERAR_BOLETIN,
  processor,
  { connection: bullmqConnection, concurrency: 1 },
);

boletinWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, result: job.returnvalue }, 'Job generar-boletin completado');
});

boletinWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Job generar-boletin fallido');
  if (job?.data.userId) {
    emitirNotificacion(job.data.userId, {
      tipo: 'job:fallido',
      titulo: 'Error generando boletines',
      mensaje: 'Ocurrió un error al generar los boletines. Por favor intente nuevamente.',
      data: { jobId: job.id },
      timestamp: new Date().toISOString(),
    });
  }
});
