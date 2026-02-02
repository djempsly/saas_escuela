import { Request, Response } from 'express';
import {
  getDiasLaborables,
  upsertDiasLaborables,
  getAsistenciaStats,
} from '../services/diasLaborables.service';
import { sanitizeErrorMessage } from '../utils/security';
import { z } from 'zod';
import prisma from '../config/db';

const diasLaborablesSchema = z.object({
  agosto: z.number().int().min(0).max(31).optional(),
  septiembre: z.number().int().min(0).max(31).optional(),
  octubre: z.number().int().min(0).max(31).optional(),
  noviembre: z.number().int().min(0).max(31).optional(),
  diciembre: z.number().int().min(0).max(31).optional(),
  enero: z.number().int().min(0).max(31).optional(),
  febrero: z.number().int().min(0).max(31).optional(),
  marzo: z.number().int().min(0).max(31).optional(),
  abril: z.number().int().min(0).max(31).optional(),
  mayo: z.number().int().min(0).max(31).optional(),
  junio: z.number().int().min(0).max(31).optional(),
});

export const getDiasLaborablesHandler = async (req: Request, res: Response) => {
  try {
    const { claseId } = req.params as { claseId: string };
    const { cicloLectivoId } = req.query as { cicloLectivoId: string };

    if (!cicloLectivoId) {
      return res.status(400).json({ message: 'cicloLectivoId es requerido' });
    }

    // Verify class belongs to user's institution
    const clase = await prisma.clase.findFirst({
      where: { id: claseId, institucionId: req.resolvedInstitucionId! },
    });

    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    const dias = await getDiasLaborables(claseId, cicloLectivoId);
    return res.status(200).json({
      data: dias || {
        agosto: 0,
        septiembre: 0,
        octubre: 0,
        noviembre: 0,
        diciembre: 0,
        enero: 0,
        febrero: 0,
        marzo: 0,
        abril: 0,
        mayo: 0,
        junio: 0,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const saveDiasLaborablesHandler = async (req: Request, res: Response) => {
  try {
    const { claseId } = req.params as { claseId: string };
    const { cicloLectivoId, ...diasData } = req.body;

    if (!cicloLectivoId) {
      return res.status(400).json({ message: 'cicloLectivoId es requerido' });
    }

    // Verify class belongs to user's institution
    const clase = await prisma.clase.findFirst({
      where: { id: claseId, institucionId: req.resolvedInstitucionId! },
    });

    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    // Validate and clean data
    const validated = diasLaborablesSchema.parse(diasData);
    const dias = await upsertDiasLaborables(claseId, cicloLectivoId, validated);

    return res.status(200).json({ data: dias, message: 'Dias laborables guardados' });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos invalidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getAsistenciaStatsHandler = async (req: Request, res: Response) => {
  try {
    const { claseId } = req.params as { claseId: string };
    const { cicloLectivoId, estudianteId } = req.query as {
      cicloLectivoId: string;
      estudianteId?: string;
    };

    if (!cicloLectivoId) {
      return res.status(400).json({ message: 'cicloLectivoId es requerido' });
    }

    // Verify class belongs to user's institution
    const clase = await prisma.clase.findFirst({
      where: { id: claseId, institucionId: req.resolvedInstitucionId! },
      include: {
        inscripciones: {
          include: {
            estudiante: {
              select: { id: true, nombre: true, apellido: true },
            },
          },
        },
      },
    });

    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    const stats = await getAsistenciaStats(claseId, cicloLectivoId, estudianteId);

    // Merge student info with stats
    const estudiantesMap = new Map(
      clase.inscripciones.map((i) => [i.estudianteId, i.estudiante])
    );

    const estadisticasConNombres = stats.estadisticas.map((e) => ({
      ...e,
      estudiante: estudiantesMap.get(e.estudianteId),
    }));

    // Add students with no attendance records
    clase.inscripciones.forEach((insc) => {
      if (!stats.estadisticas.find((e) => e.estudianteId === insc.estudianteId)) {
        estadisticasConNombres.push({
          estudianteId: insc.estudianteId,
          estudiante: insc.estudiante,
          presentes: 0,
          ausentes: 0,
          tardes: 0,
          justificados: 0,
          totalAsistencias: 0,
          porcentajeAsistencia: 0,
        });
      }
    });

    return res.status(200).json({
      data: {
        diasLaborables: stats.diasLaborables,
        totalDiasLaborables: stats.totalDiasLaborables,
        estadisticas: estadisticasConNombres.sort((a, b) => {
          const nombreA = a.estudiante?.apellido || '';
          const nombreB = b.estudiante?.apellido || '';
          return nombreA.localeCompare(nombreB);
        }),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
