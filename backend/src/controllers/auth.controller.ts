import { Request, Response } from 'express';
import { registerSuperAdmin, login, forgotPassword, resetPassword, changePassword, manualResetPassword } from '../services/auth.service';
import { loginSchema, crearUsuarioSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';

export const registerSuperAdminHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = crearUsuarioSchema.parse({ body: req.body });
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
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = forgotPasswordSchema.parse({ body: req.body });
    await forgotPassword(validatedData.body.identificador);
    // Always return success (security: prevent email enumeration)
    return res.status(200).json({ message: 'Si el usuario tiene email registrado, recibirás un enlace de recuperación.' });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Error específico: usuario sin email
    if (error.message.includes('NO_EMAIL')) {
      return res.status(400).json({
        message: 'Este usuario no tiene email registrado. Contacte al Director para resetear su clave manualmente.',
        code: 'NO_EMAIL'
      });
    }
    // Always return success for security (other errors)
    return res.status(200).json({ message: 'Si el usuario tiene email registrado, recibirás un enlace de recuperación.' });
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
    // Errores de token son seguros para mostrar
    if (error.message.includes('Token') || error.message.includes('desactivado')) {
      return res.status(400).json({ message: error.message });
    }
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
