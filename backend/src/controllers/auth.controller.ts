import { Request, Response } from 'express';
import { registerSuperAdmin, login, forgotPassword, resetPassword, changePassword, manualResetPassword } from '../services/auth.service';
import { loginSchema, registerSuperAdminSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';

export const registerSuperAdminHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSuperAdminSchema.parse({ body: req.body });
    const result = await registerSuperAdmin(validatedData.body);
    return res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: result.user.id,
          nombre: result.user.nombre,
          apellido: result.user.apellido,
          email: result.user.email,
          username: result.user.username,
          role: result.user.role,
        },
        tempPassword: result.tempPassword
      }
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Manejar error específico de admin existente
    if (error.message.includes('Ya existe un administrador')) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse({ body: req.body });
    const result = await login(validatedData.body);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores de autenticación son seguros para mostrar
    if (error.message.includes('Credenciales') || error.message.includes('desactivado')) {
      return res.status(401).json({ message: error.message });
    }
    // Error de acceso a institución
    if (error.message.includes('No tienes acceso') || error.message.includes('Institución no encontrada')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = forgotPasswordSchema.parse({ body: req.body });
    await forgotPassword(validatedData.body.identificador);

    // SEGURIDAD: SIEMPRE retornar el mismo mensaje, sin importar si el usuario existe o no.
    // Esto previene la enumeración de usuarios.
    return res.status(200).json({
      message: 'Si el identificador está registrado y tiene email, recibirás instrucciones para resetear tu contraseña. Si no tienes email registrado, contacta al Director de tu institución.'
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Solo errores críticos del sistema (JWT_SECRET, DB, etc.)
    console.error('Error en forgotPassword:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = resetPasswordSchema.parse({ body: req.body });
    await resetPassword(validatedData.body.token, validatedData.body.newPassword);
    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores específicos que son seguros para mostrar al usuario
    if (
      error.message.includes('Token') ||
      error.message.includes('enlace') ||
      error.message.includes('expirado') ||
      error.message.includes('desactivado') ||
      error.message.includes('Usuario no encontrado')
    ) {
      return res.status(400).json({ message: error.message });
    }
    // Error inesperado - loguear y retornar mensaje genérico
    console.error('Error en resetPassword:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const changePasswordHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = changePasswordSchema.parse({ body: req.body });
    const userId = req.user?.usuarioId;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const result = await changePassword(userId, validatedData.body);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores específicos son seguros para mostrar
    if (
      error.message.includes('Contraseña actual') ||
      error.message.includes('Usuario') ||
      error.message.includes('desactivado')
    ) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const manualResetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const adminUserId = req.user?.usuarioId;
    const { userId: targetUserId } = req.body;

    if (!adminUserId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (!targetUserId) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    const result = await manualResetPassword(adminUserId, targetUserId);
    return res.status(200).json({
      message: 'Contraseña reseteada correctamente',
      tempPassword: result.tempPassword,
    });
  } catch (error: any) {
    // Errores de permisos son seguros para mostrar
    if (
      error.message.includes('permisos') ||
      error.message.includes('Usuario') ||
      error.message.includes('institución')
    ) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
