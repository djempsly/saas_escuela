import dotenv from 'dotenv';
// Cargar variables de entorno ANTES de cualquier otra importación
dotenv.config();

import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  enabled: !!process.env.SENTRY_DSN,
});

// Validar variables de entorno al inicio - falla rápido si falta algo crítico
import { env, isProd } from './config/env';
import { logger } from './config/logger';

import app from './app';
import prisma from './config/db';
import { redis } from './config/redis';
import { iniciarJobVerificacionDNS } from './jobs/verify-domains';

const PORT = env.PORT;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT, env: env.NODE_ENV }, `Servidor corriendo en http://localhost:${PORT}`);

  // Iniciar job de verificación de dominios en producción
  if (isProd && env.BASE_DOMAIN && env.SERVER_IP) {
    iniciarJobVerificacionDNS();
  } else if (isProd) {
    logger.warn(
      'BASE_DOMAIN o SERVER_IP no configurados. Job de verificación de dominios desactivado.',
    );
  }
});

// ============ Graceful Shutdown ============

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Señal recibida, iniciando apagado graceful...');

  // Forzar cierre si tarda más de 10 segundos
  const forceTimeout = setTimeout(() => {
    logger.error('Timeout de apagado excedido, forzando cierre');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimeout.unref();

  // 1. Dejar de aceptar nuevas conexiones y esperar que las actuales terminen
  server.close(() => {
    logger.info('Servidor HTTP cerrado (no más conexiones activas)');
  });

  // 2. Cerrar conexiones a servicios externos
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL desconectado');
  } catch (err) {
    logger.error({ err }, 'Error al desconectar PostgreSQL');
  }

  try {
    await redis.quit();
    logger.info('Redis desconectado');
  } catch (err) {
    logger.error({ err }, 'Error al desconectar Redis');
  }

  logger.info('Servidor apagado correctamente');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
