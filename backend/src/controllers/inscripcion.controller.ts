import { Request, Response } from 'express';
import {
  inscribirEstudiante,
  inscribirPorCodigo,
  findInscripcionesByClase,
  findInscripcionesByEstudiante,
  eliminarInscripcion,
  inscribirMasivo,
  promoverMasivo,
  promoverIndividual,
} from '../services/inscripcion';
import {
  inscripcionSchema,
  inscripcionMasivaSchema,
  promoverMasivoSchema,
  promoverIndividualSchema,
} from '../utils/zod.schemas';
import { sanitizeErrorMessage } from '../utils/security';
import { getErrorMessage, isZodError } from '../utils/error-helpers';
import { Role } from '@prisma/client';
import { registrarAuditLog } from '../services/audit.service';
import { toInscripcionDTO, toInscripcionDTOList } from '../dtos';

export const inscribirEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = inscripcionSchema.parse({ body: req.body });
    const inscripcion = await inscribirEstudiante(validated.body, req.resolvedInstitucionId);
    if (req.user) {
      registrarAuditLog({
        accion: 'CREAR',
        entidad: 'Inscripcion',
        entidadId: inscripcion.id,
        descripcion: `Estudiante inscrito en clase`,
        datos: { claseId: validated.body.claseId, estudianteId: validated.body.estudianteId },
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
        ipAddress: req.ip || undefined,
        userAgent: req.headers['user-agent'],
      });
    }
    return res.status(201).json(toInscripcionDTO(inscripcion));
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      getErrorMessage(error).includes('no encontrad') ||
      getErrorMessage(error).includes('ya está inscrito') ||
      getErrorMessage(error).includes('no está activo') ||
      getErrorMessage(error).includes('cerrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const inscribirPorCodigoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Solo estudiantes pueden auto-inscribirse por código
    if (req.user.rol !== Role.ESTUDIANTE) {
      return res.status(403).json({ message: 'Solo estudiantes pueden usar esta función' });
    }

    const { codigo } = req.body as { codigo: string };
    if (!codigo) {
      return res.status(400).json({ message: 'Código de clase requerido' });
    }

    const inscripcion = await inscribirPorCodigo(codigo, req.user.usuarioId.toString());
    return res.status(201).json(toInscripcionDTO(inscripcion));
  } catch (error: unknown) {
    if (
      getErrorMessage(error).includes('no válido') ||
      getErrorMessage(error).includes('Ya estás inscrito') ||
      getErrorMessage(error).includes('no está activo') ||
      getErrorMessage(error).includes('No tienes permiso') ||
      getErrorMessage(error).includes('cerrado')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getInscripcionesByClaseHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { claseId } = req.params as { claseId: string };
    const inscripciones = await findInscripcionesByClase(claseId, req.resolvedInstitucionId);
    return res.status(200).json(toInscripcionDTOList(inscripciones));
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMisInscripcionesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.resolvedInstitucionId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    const inscripciones = await findInscripcionesByEstudiante(
      req.user.usuarioId.toString(),
      req.resolvedInstitucionId,
    );
    return res.status(200).json(toInscripcionDTOList(inscripciones));
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getInscripcionesByEstudianteHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { estudianteId } = req.params as { estudianteId: string };
    const inscripciones = await findInscripcionesByEstudiante(
      estudianteId,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(toInscripcionDTOList(inscripciones));
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const eliminarInscripcionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { id } = req.params as { id: string };
    await eliminarInscripcion(id, req.resolvedInstitucionId);
    if (req.user) {
      registrarAuditLog({
        accion: 'ELIMINAR',
        entidad: 'Inscripcion',
        entidadId: id,
        descripcion: `Inscripción eliminada`,
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
        ipAddress: req.ip || undefined,
        userAgent: req.headers['user-agent'],
      });
    }
    return res.status(204).send();
  } catch (error: unknown) {
    if (getErrorMessage(error).includes('no encontrada') || getErrorMessage(error).includes('cerrado')) {
      return res.status(404).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const inscribirMasivoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = inscripcionMasivaSchema.parse({ body: req.body });
    const resultados = await inscribirMasivo(
      validated.body.claseId,
      validated.body.estudianteIds,
      req.resolvedInstitucionId,
    );
    return res.status(200).json(resultados);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (getErrorMessage(error).includes('no encontrada') || getErrorMessage(error).includes('no activo') || getErrorMessage(error).includes('cerrado')) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const promoverMasivoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = promoverMasivoSchema.parse({ body: req.body });
    const resultado = await promoverMasivo(
      validated.body.nivelOrigenId,
      validated.body.nivelDestinoId,
      validated.body.cicloDestinoId,
      req.resolvedInstitucionId,
    );

    registrarAuditLog({
      accion: 'CREAR',
      entidad: 'Promocion',
      descripcion: `Promocion masiva: ${resultado.promovidos} promovidos, ${resultado.yaInscritos} ya inscritos`,
      datos: {
        nivelOrigenId: validated.body.nivelOrigenId,
        nivelDestinoId: validated.body.nivelDestinoId,
        cicloDestinoId: validated.body.cicloDestinoId,
        ...resultado,
      },
      usuarioId: req.user!.usuarioId,
      institucionId: req.resolvedInstitucionId,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json(resultado);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      getErrorMessage(error).includes('no encontrad') ||
      getErrorMessage(error).includes('cerrado') ||
      getErrorMessage(error).includes('no pueden ser el mismo') ||
      getErrorMessage(error).includes('No se encontraron')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const promoverIndividualHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const validated = promoverIndividualSchema.parse({ body: req.body });
    const resultado = await promoverIndividual(
      validated.body.estudianteId,
      validated.body.nivelDestinoId,
      validated.body.cicloDestinoId,
      req.resolvedInstitucionId,
    );

    registrarAuditLog({
      accion: 'CREAR',
      entidad: 'Promocion',
      entidadId: validated.body.estudianteId,
      descripcion: `Promocion individual de estudiante`,
      datos: {
        estudianteId: validated.body.estudianteId,
        nivelDestinoId: validated.body.nivelDestinoId,
        cicloDestinoId: validated.body.cicloDestinoId,
        clasesInscritas: resultado.clasesInscritas,
      },
      usuarioId: req.user!.usuarioId,
      institucionId: req.resolvedInstitucionId,
      ipAddress: req.ip || undefined,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json(resultado);
  } catch (error: unknown) {
    if (isZodError(error)) {
      return res.status(400).json({ message: 'Datos inválidos', errors: error.issues });
    }
    if (
      getErrorMessage(error).includes('no encontrad') ||
      getErrorMessage(error).includes('cerrado') ||
      getErrorMessage(error).includes('No hay clases') ||
      getErrorMessage(error).includes('ya está inscrito')
    ) {
      return res.status(400).json({ message: getErrorMessage(error) });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
