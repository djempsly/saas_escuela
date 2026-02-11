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
import { iniciarJobVerificacionDNS } from './jobs/verify-domains';

const PORT = env.PORT;

app.listen(PORT, () => {
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
