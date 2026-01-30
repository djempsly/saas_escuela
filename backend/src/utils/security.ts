import crypto from 'crypto';

/**
 * Genera una contraseña temporal segura usando crypto.randomBytes
 * @param length Longitud de la contraseña (default: 12)
 * @returns Contraseña alfanumérica segura
 */
export const generateSecurePassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomBytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
};

/**
 * Genera un username único basado en nombre y apellido
 * @param nombre Nombre del usuario
 * @param apellido Apellido del usuario
 * @returns Username en formato nombre.apellido + 4 dígitos aleatorios
 */
export const generateUsername = (nombre: string, apellido: string): string => {
  const randomSuffix = crypto.randomInt(1000, 9999);
  const cleanNombre = nombre.toLowerCase().trim().replace(/\s+/g, '');
  const cleanApellido = apellido.toLowerCase().trim().replace(/\s+/g, '');
  return `${cleanNombre}.${cleanApellido}${randomSuffix}`;
};

/**
 * Sanitiza mensajes de error para no exponer información sensible
 * @param error Error capturado
 * @param defaultMessage Mensaje por defecto para errores no controlados
 * @returns Mensaje seguro para el cliente
 */
export const sanitizeErrorMessage = (error: unknown, defaultMessage: string = 'Error interno del servidor'): string => {
  if (error instanceof Error) {
    // Lista de errores que son seguros para mostrar al usuario
    const safeErrors = [
      'Credenciales no válidas',
      'Usuario no encontrado',
      'El correo electrónico ya está en uso',
      'No tienes permisos',
      'Token inválido',
      'Token expirado',
      'Usuario desactivado',
      'Institución no encontrada',
      'Datos no válidos',
    ];

    // Si el mensaje es seguro, lo devolvemos
    for (const safeError of safeErrors) {
      if (error.message.includes(safeError)) {
        return error.message;
      }
    }
  }

  // Para errores no controlados, devolvemos el mensaje genérico
  return defaultMessage;
};
