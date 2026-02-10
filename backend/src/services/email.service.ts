import { logger } from '../config/logger';

export const sendPasswordResetEmail = async (email: string, link: string) => {
  // En un entorno real, aquí se usaría un servicio como SendGrid, Resend o Nodemailer.
  // Por ahora, simulamos el envío mostrando el link en la consola.
  logger.info({ email, link, action: 'send_password_reset_email' }, 'Mock email enviado');
};
