import dotenv from 'dotenv';
// Cargar variables de entorno ANTES de cualquier otra importación
dotenv.config();

// Validar variables de entorno al inicio - falla rápido si falta algo crítico
import { env, isProd } from './config/env';

import app from './app';
import { iniciarJobVerificacionDNS } from './jobs/verify-domains';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${env.NODE_ENV}`);

  // Iniciar job de verificación de dominios en producción
  if (isProd && env.BASE_DOMAIN && env.SERVER_IP) {
    iniciarJobVerificacionDNS();
  } else if (isProd) {
    console.warn('⚠️  BASE_DOMAIN o SERVER_IP no configurados. Job de verificación de dominios desactivado.');
  }
});