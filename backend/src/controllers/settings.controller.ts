import { Request, Response } from 'express';
import { getSystemSettings, updateSystemSettings, SystemSettingsInput } from '../services/settings.service';
import { sanitizeErrorMessage } from '../utils/security';
import { z } from 'zod';

const settingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  allowPublicRegistration: z.boolean().optional(),
  maxInstitutionsPerPlan: z.number().int().min(1).max(1000).optional(),
  defaultSessionTimeout: z.number().int().min(1).max(168).optional(),
});

export const getSystemSettingsHandler = async (req: Request, res: Response) => {
  try {
    const settings = await getSystemSettings();
    return res.status(200).json({ data: settings });
  } catch (error: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const updateSystemSettingsHandler = async (req: Request, res: Response) => {
  try {
    const validated = settingsSchema.parse(req.body);
    const settings = await updateSystemSettings(validated as SystemSettingsInput);
    return res.status(200).json({
      message: 'Configuracion actualizada correctamente',
      data: settings,
    });
  } catch (error: any) {
    if (error.issues) {
      return res.status(400).json({ message: 'Datos invalidos', errors: error.issues });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
