export const sendPasswordResetEmail = async (email: string, link: string) => {
  // En un entorno real, aquí se usaría un servicio como SendGrid, Resend o Nodemailer.
  // Por ahora, simulamos el envío mostrando el link en la consola.
  console.log('---------------------------------------------------------');
  console.log(`[EMAIL MOCK] Enviando correo a: ${email}`);
  console.log(`[EMAIL MOCK] Link de recuperación: ${link}`);
  console.log('---------------------------------------------------------');
};
