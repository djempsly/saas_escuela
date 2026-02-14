import { Worker, Job } from 'bullmq';
import ExcelJS from 'exceljs';
import { bullmqConnection, QUEUE_NAMES } from '../config/bullmq';
import { logger } from '../config/logger';
import { getSabanaByNivel } from '../services/sabana';
import type { SabanaData } from '../services/sabana';
import { uploadBufferToS3 } from '../services/s3.service';
import { emitirNotificacion } from '../services/socket-emitter.service';
import type { ExportarExcelJobData, ExportarExcelJobResult } from '../queues/types';

// ── Estilos reutilizables ──
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: '1F4E79' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFF' },
  size: 11,
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const INFO_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  size: 12,
};

/**
 * Construye una hoja con formato para una sábana de nivel.
 */
export function buildSabanaSheet(
  workbook: ExcelJS.Workbook,
  sabana: SabanaData,
) {
  const sheetName = sabana.nivel.nombre.substring(0, 31);
  const ws = workbook.addWorksheet(sheetName);

  // ── Fila 1: Información ──
  const fecha = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const infoText = `${sabana.nivel.nombre} — ${sabana.cicloLectivo.nombre} — Generado: ${fecha}`;

  // Calcular total de columnas: Estudiante + (materias × 5 cols cada una) + Situación Final
  const totalCols = 1 + sabana.materias.length * 5 + 1;

  ws.mergeCells(1, 1, 1, totalCols);
  const infoCell = ws.getCell(1, 1);
  infoCell.value = infoText;
  infoCell.font = INFO_FONT;
  infoCell.alignment = { vertical: 'middle' };

  // ── Fila 2: Headers ──
  const headers: string[] = ['Estudiante'];
  for (const materia of sabana.materias) {
    headers.push(
      `${materia.nombre} P1`,
      `${materia.nombre} P2`,
      `${materia.nombre} P3`,
      `${materia.nombre} P4`,
      `${materia.nombre} Prom`,
    );
  }
  headers.push('Situación Final');

  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 30;

  // ── Filas de datos ──
  sabana.estudiantes.forEach((est, idx) => {
    const rowNum = idx + 3;
    const row = ws.getRow(rowNum);

    // Nombre completo
    const nombreCompleto = [est.nombre, est.segundoNombre, est.apellido, est.segundoApellido]
      .filter(Boolean)
      .join(' ');
    row.getCell(1).value = nombreCompleto;

    let col = 2;
    // Determinar situación final: APROBADO si todos los promedios >= promedio mínimo (usamos situacion de cada materia)
    const situaciones: (string | null)[] = [];

    for (const materia of sabana.materias) {
      const cal = est.calificaciones[materia.id];
      row.getCell(col).value = cal?.p1 ?? '';
      row.getCell(col + 1).value = cal?.p2 ?? '';
      row.getCell(col + 2).value = cal?.p3 ?? '';
      row.getCell(col + 3).value = cal?.p4 ?? '';
      row.getCell(col + 4).value = cal?.promedioFinal ?? cal?.promedio ?? '';
      if (cal?.situacion) situaciones.push(cal.situacion);
      col += 5;
    }

    // Situación final del estudiante
    let situacionFinal = '';
    if (situaciones.length > 0) {
      const reprobadas = situaciones.filter((s) => s && s.toUpperCase().includes('REPROB'));
      situacionFinal = reprobadas.length > 0 ? 'REPROBADO' : 'APROBADO';
    }
    const situacionCell = row.getCell(col);
    situacionCell.value = situacionFinal;
    if (situacionFinal === 'REPROBADO') {
      situacionCell.font = { bold: true, color: { argb: 'CC0000' } };
    } else if (situacionFinal === 'APROBADO') {
      situacionCell.font = { bold: true, color: { argb: '006600' } };
    }

    // Bordes en todas las celdas de la fila
    for (let c = 1; c <= totalCols; c++) {
      row.getCell(c).border = THIN_BORDER;
      if (c > 1) {
        row.getCell(c).alignment = { horizontal: 'center' };
      }
    }
  });

  // ── Auto-ajustar ancho de columnas ──
  ws.columns.forEach((col, i) => {
    if (i === 0) {
      // Columna nombre: mínimo 30
      col.width = 30;
    } else {
      // Calcular ancho basado en header
      const headerLen = headers[i]?.length ?? 10;
      col.width = Math.max(headerLen + 2, 10);
    }
  });

  // ── Congelar paneles: fila de headers (fila 2) queda visible ──
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

  return ws;
}

async function processor(job: Job<ExportarExcelJobData>): Promise<ExportarExcelJobResult> {
  const { nivelId, cicloLectivoId, institucionId, userId } = job.data;

  // 1. Obtener data
  const sabana = await getSabanaByNivel(nivelId, cicloLectivoId, institucionId, undefined, 1, 10000);
  await job.updateProgress(30);

  // 2. Construir workbook con formato
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LHAMS';
  workbook.created = new Date();
  buildSabanaSheet(workbook, sabana);
  await job.updateProgress(70);

  // 3. Generar buffer
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await job.updateProgress(80);

  // 4. Subir a S3
  const filename = `sabana-${sabana.nivel.nombre.replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
  const url = await uploadBufferToS3(buffer, filename, 'exports', institucionId);
  await job.updateProgress(100);

  // 5. Notificar
  emitirNotificacion(userId, {
    tipo: 'job:completado',
    titulo: 'Exportación Excel lista',
    mensaje: `La sábana de notas de ${sabana.nivel.nombre} ha sido exportada`,
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
