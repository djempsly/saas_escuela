import { verificarDominiosPendientes } from '../services/domain.service';

// Intervalo de verificación: 1 hora (en milisegundos)
const INTERVALO = 60 * 60 * 1000;

let intervalId: NodeJS.Timeout | null = null;

/**
 * Inicia el job de verificación periódica de dominios.
 *
 * Este job revisa todos los dominios pendientes de verificación
 * y actualiza su estado si el DNS ya apunta correctamente al servidor.
 *
 * Debe llamarse al iniciar la aplicación.
 */
export function iniciarJobVerificacionDNS(): void {
  console.log('[JOB] Verificación de DNS iniciada. Intervalo: 1 hora.');

  // Ejecutar una vez al inicio (con delay para que el servidor esté listo)
  setTimeout(async () => {
    try {
      console.log('[JOB] Ejecutando verificación inicial de dominios...');
      const resultado = await verificarDominiosPendientes();
      console.log(
        `[JOB] Verificación inicial completada. Verificados: ${resultado.verificados}, Pendientes: ${resultado.fallidos}`
      );
    } catch (error) {
      console.error('[JOB] Error en verificación inicial:', error);
    }
  }, 5000); // 5 segundos después del inicio

  // Programar ejecución periódica
  intervalId = setInterval(async () => {
    try {
      console.log('[JOB] Verificando dominios pendientes...');
      const resultado = await verificarDominiosPendientes();
      console.log(
        `[JOB] Verificación completada. Verificados: ${resultado.verificados}, Pendientes: ${resultado.fallidos}`
      );
    } catch (error) {
      console.error('[JOB] Error en verificación de DNS:', error);
    }
  }, INTERVALO);
}

/**
 * Detiene el job de verificación.
 * Útil para testing o shutdown graceful.
 */
export function detenerJobVerificacionDNS(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[JOB] Verificación de DNS detenida.');
  }
}
