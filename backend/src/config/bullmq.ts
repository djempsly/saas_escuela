import { redis } from './redis';

// Reusar la conexion ioredis existente (ya tiene maxRetriesPerRequest: null)
export const bullmqConnection = redis;

export const QUEUE_NAMES = {
  GENERAR_BOLETIN: 'generar-boletin',
  EXPORTAR_EXCEL: 'exportar-excel',
  NOTIFICACIONES_MASIVAS: 'notificaciones-masivas',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { age: 3600 * 24 }, // 24h
  removeOnFail: { age: 3600 * 24 * 7 }, // 7 dias
};
