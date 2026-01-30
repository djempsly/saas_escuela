import { Request, Response } from 'express';
import { createUser, resetUserPasswordManual } from '../services/user.service';
import { crearUsuarioSchema } from '../utils/zod.schemas';
import { ROLES } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';

export const createUserHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.institucionId) {
      return res.status(403).json({ message: 'Acción no permitida' });
    }

    // Only DIRECTORS can create users
    if (req.user.rol !== ROLES.DIRECTOR) {
      return res.status(403).json({ message: 'No tienes permisos para crear usuarios' });
    }

    const validatedData = crearUsuarioSchema.parse({ body: req.body });

    // Cannot create ADMIN or DIRECTOR
    if (validatedData.body.rol === ROLES.ADMIN || validatedData.body.rol === ROLES.DIRECTOR) {
      return res.status(403).json({ message: 'No puedes crear usuarios con este rol' });
    }

    const result = await createUser(validatedData.body, req.user.institucionId);
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
    // Error de email duplicado es seguro mostrar
    if (error.message.includes('correo electrónico ya está en uso')) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const resetUserPasswordManualHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const requester = {
      id: req.user.usuarioId.toString(),
      institucionId: req.user.institucionId ? req.user.institucionId.toString() : null,
      role: req.user.rol
    };

    const result = await resetUserPasswordManual(id, requester);
    return res.status(200).json({
      message: 'Contraseña reseteada exitosamente',
      tempPassword: result.tempPassword
    });
  } catch (error: any) {
    // Errores de permisos son seguros para mostrar
    if (error.message.includes('No tienes permisos') ||
        error.message.includes('Usuario no encontrado') ||
        error.message.includes('desactivado')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
