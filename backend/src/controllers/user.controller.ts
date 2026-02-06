import { Request, Response } from 'express';
import {
  createUser,
  resetUserPasswordManual,
  findUsersByInstitucion,
  findStudentsByDocente,
  findStaffByInstitucion,
  findUserById,
  updateUserProfile,
  updateUserById,
  findCoordinadores,
  getCoordinacionInfo,
  assignCiclosToCoordinator,
  assignNivelesToCoordinator,
} from '../services/user.service';
import { crearUsuarioSchema } from '../utils/zod.schemas';
import { ROLES } from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { getFileUrl } from '../middleware/upload.middleware';

export const createUserHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    const validatedData = crearUsuarioSchema.parse({ body: req.body });

    // ADMIN puede crear DIRECTOR (con o sin institucion)
    if (req.user.rol === ROLES.ADMIN) {
      // ADMIN puede crear cualquier rol excepto otro ADMIN
      if (validatedData.body.rol === ROLES.ADMIN) {
        return res.status(403).json({ message: 'No puedes crear usuarios con rol ADMIN' });
      }

      // Usar resolvedInstitucionId (puede venir de query param para ADMIN)
      const institucionId = req.resolvedInstitucionId || validatedData.body.institucionId || null;
      const result = await createUser(validatedData.body, institucionId as string);

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
          tempPassword: result.tempPassword,
        },
      });
    }

    // DIRECTOR solo puede crear usuarios de su institucion
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    // Only DIRECTORS can create users (ademas del ADMIN ya manejado arriba)
    if (req.user.rol !== ROLES.DIRECTOR) {
      return res.status(403).json({ message: 'No tienes permisos para crear usuarios' });
    }

    // DIRECTOR cannot create ADMIN or DIRECTOR
    if (validatedData.body.rol === ROLES.ADMIN || validatedData.body.rol === ROLES.DIRECTOR) {
      return res.status(403).json({ message: 'No puedes crear usuarios con este rol' });
    }

    const result = await createUser(validatedData.body, req.resolvedInstitucionId);
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
      return res.status(400).json({ message: 'Datos no validos', errors: error.issues });
    }
    // Error de email duplicado es seguro mostrar
    if (error.message.includes('correo electronico ya esta en uso')) {
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
      // Usar resolvedInstitucionId para filtrar por tenant
      institucionId: req.resolvedInstitucionId || null,
      role: req.user.rol
    };

    const result = await resetUserPasswordManual(id, requester);
    return res.status(200).json({
      message: 'Contrasena reseteada exitosamente',
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

export const getAllUsersHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    const { role, nivelId } = req.query as { role?: string; nivelId?: string };

    // Usar resolvedInstitucionId (ya resuelto por el middleware)
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'Debe especificar una institucion' });
    }

    // Lógica especial para DOCENTES: Solo pueden ver sus estudiantes
    if (req.user.rol === ROLES.DOCENTE) {
      if (role && role !== ROLES.ESTUDIANTE) {
        return res.status(403).json({ message: 'Solo puedes ver listados de estudiantes' });
      }
      const students = await findStudentsByDocente(req.user.usuarioId.toString(), req.resolvedInstitucionId);
      return res.status(200).json({ data: students });
    }

    // Solo ADMIN y DIRECTOR pueden ver contrasenas temporales
    const canSeePasswords = req.user.rol === ROLES.ADMIN || req.user.rol === ROLES.DIRECTOR;
    const users = await findUsersByInstitucion(req.resolvedInstitucionId, role, canSeePasswords, nivelId);

    return res.status(200).json({ data: users });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getStaffHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    // Usar resolvedInstitucionId (ya resuelto por el middleware)
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No tienes una institucion asignada' });
    }

    // Solo ADMIN y DIRECTOR pueden ver contrasenas temporales
    const canSeePasswords = req.user.rol === ROLES.ADMIN || req.user.rol === ROLES.DIRECTOR;
    const staff = await findStaffByInstitucion(req.resolvedInstitucionId, canSeePasswords);

    return res.status(200).json({ data: staff });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getUserByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar permisos multi-tenant usando resolvedInstitucionId
    if (req.user.rol !== ROLES.ADMIN && user.institucionId !== req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No tienes permisos para ver este usuario' });
    }

    return res.status(200).json({ data: user });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateProfileHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { nombre, apellido, email } = req.body;
    let fotoUrl: string | undefined = undefined;

    // Si hay archivo subido
    if (req.file) {
      fotoUrl = getFileUrl(req.file);
    }

    const updatedUser = await updateUserProfile(req.user.usuarioId, {
      nombre,
      apellido,
      email,
      fotoUrl,
    });

    return res.status(200).json({
      message: 'Perfil actualizado correctamente',
      data: updatedUser,
      fotoUrl: updatedUser.fotoUrl,
    });
  } catch (error: any) {
    if (error.message.includes('correo electronico ya esta en uso')) {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const { nombre, apellido, email, activo } = req.body;

    const updatedUser = await updateUserById(
      id,
      { nombre, apellido, email, activo },
      req.resolvedInstitucionId || null,
      req.user.rol
    );

    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message.includes('correo electronico ya esta en uso')) {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('No tienes permisos') || error.message.includes('no encontrado')) {
      return res.status(403).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const uploadPhotoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporciono ninguna imagen' });
    }

    const fotoUrl = getFileUrl(req.file);

    const updatedUser = await updateUserProfile(req.user.usuarioId, { fotoUrl });

    return res.status(200).json({
      message: 'Foto actualizada correctamente',
      fotoUrl: updatedUser.fotoUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCoordinadoresHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    // Usar resolvedInstitucionId
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No tienes una institucion asignada' });
    }

    const coordinadores = await findCoordinadores(req.resolvedInstitucionId);
    return res.status(200).json({ data: coordinadores });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getCoordinacionInfoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const info = await getCoordinacionInfo(id);
    return res.status(200).json({ data: info });
  } catch (error: any) {
    if (error.message === 'Usuario no encontrado') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const assignCiclosHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { cicloIds } = req.body;

    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!Array.isArray(cicloIds)) {
      return res.status(400).json({ message: 'cicloIds debe ser un array' });
    }

    const result = await assignCiclosToCoordinator(id, cicloIds, req.resolvedInstitucionId);
    return res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.message.includes('no encontrado') || error.message.includes('no son validos')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const assignNivelesHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { nivelIds } = req.body;

    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!Array.isArray(nivelIds)) {
      return res.status(400).json({ message: 'nivelIds debe ser un array' });
    }

    const result = await assignNivelesToCoordinator(id, nivelIds, req.resolvedInstitucionId);
    return res.status(200).json({ data: result });
  } catch (error: any) {
    if (error.message.includes('no encontrado')) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
