import { Request, Response } from 'express';
import { createUser, resetUserPasswordManual } from '../services/user.service';
import { crearUsuarioSchema } from '../utils/zod.schemas';
import { ROLES } from '../utils/zod.schemas';

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
    
    // Cannot create SUPER_ADMIN or DIRECTOR
    if (validatedData.body.rol === ROLES.ADMIN || validatedData.body.rol === ROLES.DIRECTOR) {
        return res.status(403).json({ message: 'No puedes crear usuarios con este rol' });
    }

    const user = await createUser(validatedData.body, req.user.institucionId);
    return res.status(201).json(user);
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos no válidos', errors: error.issues });
    }
    return res.status(500).json({ message: error.message });
  }
};

export const resetUserPasswordManualHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Ensure req.user exists (handled by authMiddleware)
    if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
    }

    // Convert undefined/null/number/string issues
    const requester = {
        id: req.user.usuarioId.toString(),
        institucionId: req.user.institucionId ? req.user.institucionId.toString() : null,
        role: req.user.rol
    };

    const result = await resetUserPasswordManual(id, requester);
    return res.status(200).json({ message: 'Contraseña reseteada exitosamente', tempPassword: result.tempPassword });
  } catch (error: any) {
    return res.status(403).json({ message: error.message });
  }
};
