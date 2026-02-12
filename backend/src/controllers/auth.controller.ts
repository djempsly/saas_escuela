import { Request, Response } from 'express';
import {
  registerSuperAdmin,
  login,
  forgotPassword,
  resetPassword,
  changePassword,
  manualResetPassword,
  refreshAccessToken,
  logout,
} from '../services/auth.service';
import {
  loginSchema,
  registerSuperAdminSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { getErrorMessage, isZodError } from '../utils/error-helpers';
import { toUserDTO } from '../dtos';

export const registerSuperAdminHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSuperAdminSchema.parse({ body: req.body });
    const result = await registerSuperAdmin(validatedData.body);
    return res.status(201).json({
      status: 'success',
      data: {
        user: toUserDTO(result.user),
        tempPassword: result.tempPassword,
      },
    });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Manejar error específico de admin existente
    if (getErrorMessage(error).includes('Ya existe un administrador')) {
      return res.status(409).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse({ body: req.body });
    const result = await login(validatedData.body);
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores de autenticación son seguros para mostrar
    if (getErrorMessage(error).includes('Credenciales') || getErrorMessage(error).includes('desactivado')) {
      return res.status(401).json({ message: getErrorMessage(error) });
    }
    // Error de acceso a institución
    if (
      getErrorMessage(error).includes('No tienes acceso') ||
      getErrorMessage(error).includes('Institución no encontrada')
    ) {
      return res.status(403).json({ message: getErrorMessage(error) });
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
      message:
        'Si el identificador está registrado y tiene email, recibirás instrucciones para resetear tu contraseña. Si no tienes email registrado, contacta al Director de tu institución.',
    });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Solo errores críticos del sistema (JWT_SECRET, DB, etc.)
    req.log.error({ err: error }, 'Error en forgotPassword');
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = resetPasswordSchema.parse({ body: req.body });
    await resetPassword(validatedData.body.token, validatedData.body.newPassword);
    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores específicos que son seguros para mostrar al usuario
    if (
      getErrorMessage(error).includes('Token') ||
      getErrorMessage(error).includes('enlace') ||
      getErrorMessage(error).includes('expirado') ||
      getErrorMessage(error).includes('desactivado') ||
      getErrorMessage(error).includes('Usuario no encontrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    // Error inesperado - loguear y retornar mensaje genérico
    req.log.error({ err: error }, 'Error en resetPassword');
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
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    // Errores específicos son seguros para mostrar
    if (
      getErrorMessage(error).includes('Contraseña actual') ||
      getErrorMessage(error).includes('Usuario') ||
      getErrorMessage(error).includes('desactivado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
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
  } catch (error: unknown) {
    // Errores de permisos son seguros para mostrar
    if (
      getErrorMessage(error).includes('permisos') ||
      getErrorMessage(error).includes('Usuario') ||
      getErrorMessage(error).includes('institución')
    ) {
      return res.status(403).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const refreshTokenHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = refreshTokenSchema.parse({ body: req.body });
    const result = await refreshAccessToken(validatedData.body.refreshToken);
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    if (
      getErrorMessage(error).includes('inválido') ||
      getErrorMessage(error).includes('expirado') ||
      getErrorMessage(error).includes('desactivado')
    ) {
      return res.status(401).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const logoutHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = refreshTokenSchema.parse({ body: req.body });
    await logout(validatedData.body.refreshToken);
    return res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
