import { logger } from '../config/logger';
import { boletinWorker } from './generar-boletin.worker';
import { excelWorker } from './exportar-excel.worker';
import { notificacionesWorker } from './notificaciones-masivas.worker';

const allWorkers = [boletinWorker, excelWorker, notificacionesWorker];

logger.info(
  { workers: allWorkers.map((w) => w.name) },
  'BullMQ workers iniciados',
);

export async function closeAllWorkers(): Promise<void> {
  await Promise.all(allWorkers.map((w) => w.close()));
}
