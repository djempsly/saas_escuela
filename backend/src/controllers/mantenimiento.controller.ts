import { Request, Response } from 'express';
import { z } from 'zod';
import { crearAviso, getAvisosActivos, getAvisoActual, cancelarAviso } from '../services/mantenimiento.service';
import { crearNotificacionesMasivas } from '../services/notificacion.service';
import { emitirNotificacionMasiva } from '../services/socket-emitter.service';
import { recordatorioMantenimientoQueue } from '../queues';
import { sanitizeErrorMessage } from '../utils/security';
import prisma from '../config/db';

const crearAvisoSchema = z.object({
  titulo: z.string().min(1).max(200),
  mensaje: z.string().min(1).max(2000),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
});

export const crearAvisoHandler = async (req: Request, res: Response) => {
  try {
    const parsed = crearAvisoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos invalidos', errors: parsed.error.flatten() });
    }

    const { titulo, mensaje, fechaInicio, fechaFin } = parsed.data;
    const userId = req.user!.usuarioId;

    const aviso = await crearAviso(titulo, mensaje, new Date(fechaInicio), new Date(fechaFin), userId);

    // Notify directors
    const directores = await prisma.user.findMany({
      where: { role: 'DIRECTOR', activo: true },
      select: { id: true },
    });

    const directorIds = directores.map((d) => d.id);

    if (directorIds.length > 0) {
      await crearNotificacionesMasivas(
        directorIds,
        `Mantenimiento programado: ${titulo}`,
        mensaje,
      );

      emitirNotificacionMasiva(directorIds, {
        tipo: 'mantenimiento',
        titulo: `Mantenimiento programado: ${titulo}`,
        mensaje,
        timestamp: new Date().toISOString(),
      });
    }

    // Schedule reminder jobs
    const now = Date.now();
    const inicio = new Date(fechaInicio).getTime();

    const delay48h = inicio - 48 * 60 * 60 * 1000 - now;
    if (delay48h > 0) {
      await recordatorioMantenimientoQueue.add(
        `recordatorio-48h-${aviso.id}`,
        { avisoId: aviso.id, horasAntes: 48 },
        { delay: delay48h },
      );
    }

    const delay24h = inicio - 24 * 60 * 60 * 1000 - now;
    if (delay24h > 0) {
      await recordatorioMantenimientoQueue.add(
        `recordatorio-24h-${aviso.id}`,
        { avisoId: aviso.id, horasAntes: 24 },
        { delay: delay24h },
      );
    }

    return res.status(201).json(aviso);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getAvisoActivoHandler = async (_req: Request, res: Response) => {
  try {
    const aviso = await getAvisoActual();
    return res.status(200).json(aviso);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getAvisosHandler = async (_req: Request, res: Response) => {
  try {
    const avisos = await getAvisosActivos();
    return res.status(200).json(avisos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const cancelarAvisoHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const aviso = await cancelarAviso(id);
    return res.status(200).json(aviso);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
