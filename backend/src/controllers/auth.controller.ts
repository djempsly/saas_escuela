import { Request, Response } from 'express';
import { registerSuperAdmin, login, forgotPassword, resetPassword } from '../services/auth.service';
import { loginSchema, crearUsuarioSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/zod.schemas';

export const registerSuperAdminHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = crearUsuarioSchema.parse({ body: req.body });
    const user = await registerSuperAdmin(validatedData.body);
    return res.status(201).json(user);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const loginHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse({ body: req.body });
    const token = await login(validatedData.body);
    return res.status(200).json(token);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(401).json({ message: error.message });
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = forgotPasswordSchema.parse({ body: req.body });
    await forgotPassword(validatedData.body.email);
    // Always return success
    return res.status(200).json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(500).json({ message: error.message });
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
    return res.status(400).json({ message: error.message });
  }
};