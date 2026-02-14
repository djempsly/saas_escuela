import { logger } from '../config/logger';
import { boletinWorker } from './generar-boletin.worker';
import { excelWorker } from './exportar-excel.worker';
import { exportarTodoWorker } from './exportar-todo.worker';
import { notificacionesWorker } from './notificaciones-masivas.worker';
import { suscripcionesWorker } from './verificar-suscripciones.worker';
import { recordatorioMantenimientoWorker } from './recordatorio-mantenimiento.worker';

const allWorkers = [boletinWorker, excelWorker, exportarTodoWorker, notificacionesWorker, suscripcionesWorker, recordatorioMantenimientoWorker];

logger.info(
  { workers: allWorkers.map((w) => w.name) },
  'BullMQ workers iniciados',
);

export async function closeAllWorkers(): Promise<void> {
  await Promise.all(allWorkers.map((w) => w.close()));
}
