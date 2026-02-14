import { Queue } from 'bullmq';
import { bullmqConnection, QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '../config/bullmq';
import type { GenerarBoletinJobData, ExportarExcelJobData, ExportarTodoJobData, NotificacionesMasivasJobData, VerificarSuscripcionesJobData, RecordatorioMantenimientoJobData } from './types';

export const boletinQueue = new Queue<GenerarBoletinJobData>(QUEUE_NAMES.GENERAR_BOLETIN, {
  connection: bullmqConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const excelQueue = new Queue<ExportarExcelJobData>(QUEUE_NAMES.EXPORTAR_EXCEL, {
  connection: bullmqConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const exportarTodoQueue = new Queue<ExportarTodoJobData>(QUEUE_NAMES.EXPORTAR_TODO, {
  connection: bullmqConnection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const notificacionesQueue = new Queue<NotificacionesMasivasJobData>(
  QUEUE_NAMES.NOTIFICACIONES_MASIVAS,
  {
    connection: bullmqConnection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
);

export const suscripcionesQueue = new Queue<VerificarSuscripcionesJobData>(
  QUEUE_NAMES.VERIFICAR_SUSCRIPCIONES,
  {
    connection: bullmqConnection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
);

export const recordatorioMantenimientoQueue = new Queue<RecordatorioMantenimientoJobData>(
  QUEUE_NAMES.RECORDATORIO_MANTENIMIENTO,
  {
    connection: bullmqConnection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  },
);

const allQueues = [boletinQueue, excelQueue, exportarTodoQueue, notificacionesQueue, suscripcionesQueue, recordatorioMantenimientoQueue];

export async function closeAllQueues(): Promise<void> {
  await Promise.all(allQueues.map((q) => q.close()));
}
