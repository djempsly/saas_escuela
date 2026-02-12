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
} from '../../services/user';
import { crearUsuarioSchema } from '../../utils/zod.schemas';
import { ROLES } from '../../utils/zod.schemas';
import { sanitizeErrorMessage } from '../../utils/security';
import { uploadToS3 } from '../../services/s3.service';
import { registrarAuditLog } from '../../services/audit.service';
import { toUserDTO, toUserDTOList } from '../../dtos';

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
          user: toUserDTO(result.user),
          tempPassword: result.tempPassword,
        },
      });
    }

    // Requiere institución para roles no-ADMIN
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'Accion no permitida' });
    }

    // COORDINADOR_ACADEMICO solo puede crear ESTUDIANTES
    if (req.user.rol === ROLES.COORDINADOR_ACADEMICO) {
      if (validatedData.body.rol !== ROLES.ESTUDIANTE) {
        return res.status(403).json({ message: 'Solo puedes crear estudiantes' });
      }
      const result = await createUser(validatedData.body, req.resolvedInstitucionId);
      registrarAuditLog({
        accion: 'CREAR',
        entidad: 'Usuario',
        entidadId: result.user.id,
        descripcion: `Estudiante creado: ${result.user.nombre} ${result.user.apellido}`,
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
      });
      return res.status(201).json({
        status: 'success',
        data: {
          user: toUserDTO(result.user),
          tempPassword: result.tempPassword,
        },
      });
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
    registrarAuditLog({
      accion: 'CREAR',
      entidad: 'Usuario',
      entidadId: result.user.id,
      descripcion: `Usuario creado: ${result.user.nombre} ${result.user.apellido} (${result.user.role})`,
      usuarioId: req.user.usuarioId.toString(),
      institucionId: req.resolvedInstitucionId,
    });
    return res.status(201).json({
      status: 'success',
      data: {
        user: toUserDTO(result.user),
        tempPassword: result.tempPassword,
      },
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
      role: req.user.rol,
    };

    const result = await resetUserPasswordManual(id, requester);
    return res.status(200).json({
      message: 'Contrasena reseteada exitosamente',
      tempPassword: result.tempPassword,
    });
  } catch (error: any) {
    // Errores de permisos son seguros para mostrar
    if (
      error.message.includes('No tienes permisos') ||
      error.message.includes('Usuario no encontrado') ||
      error.message.includes('desactivado')
    ) {
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
      const students = await findStudentsByDocente(
        req.user.usuarioId.toString(),
        req.resolvedInstitucionId,
      );
      return res.status(200).json({ data: toUserDTOList(students) });
    }

    // Solo ADMIN y DIRECTOR pueden ver contrasenas temporales
    const canSeePasswords = req.user.rol === ROLES.ADMIN || req.user.rol === ROLES.DIRECTOR;
    const users = await findUsersByInstitucion(
      req.resolvedInstitucionId,
      role,
      canSeePasswords,
      nivelId,
    );

    return res.status(200).json({ data: toUserDTOList(users) });
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

    return res.status(200).json({ data: toUserDTOList(staff) });
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

    return res.status(200).json({ data: toUserDTO(user) });
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
      fotoUrl = await uploadToS3(req.file, 'perfiles');
    }

    const updatedUser = await updateUserProfile(req.user.usuarioId, {
      nombre,
      apellido,
      email,
      fotoUrl,
    });

    const userDTO = toUserDTO(updatedUser);
    return res.status(200).json({
      message: 'Perfil actualizado correctamente',
      data: userDTO,
      fotoUrl: userDTO.fotoUrl,
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

    const { nombre, segundoNombre, apellido, segundoApellido, email, activo } = req.body;

    const updatedUser = await updateUserById(
      id,
      { nombre, segundoNombre, apellido, segundoApellido, email, activo },
      req.resolvedInstitucionId || null,
      req.user.rol,
    );

    return res.status(200).json({
      message: 'Usuario actualizado correctamente',
      data: toUserDTO(updatedUser),
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

    const fotoUrl = await uploadToS3(req.file, 'perfiles');

    const updatedUser = await updateUserProfile(req.user.usuarioId, { fotoUrl });

    return res.status(200).json({
      message: 'Foto actualizada correctamente',
      fotoUrl: updatedUser.fotoUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
