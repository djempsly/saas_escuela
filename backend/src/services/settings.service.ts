import prisma from '../config/db';

export interface SystemSettingsInput {
  maintenanceMode?: boolean;
  allowPublicRegistration?: boolean;
  maxInstitutionsPerPlan?: number;
  defaultSessionTimeout?: number;
}

export const getSystemSettings = async () => {
  let settings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
  });

  // Si no existe, crear con valores por defecto
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        id: 'system',
        maintenanceMode: false,
        allowPublicRegistration: false,
        maxInstitutionsPerPlan: 10,
        defaultSessionTimeout: 24,
      },
    });
  }

  return settings;
};

export const updateSystemSettings = async (data: SystemSettingsInput) => {
  return prisma.systemSettings.upsert({
    where: { id: 'system' },
    update: {
      ...(data.maintenanceMode !== undefined && { maintenanceMode: data.maintenanceMode }),
      ...(data.allowPublicRegistration !== undefined && { allowPublicRegistration: data.allowPublicRegistration }),
      ...(data.maxInstitutionsPerPlan !== undefined && { maxInstitutionsPerPlan: data.maxInstitutionsPerPlan }),
      ...(data.defaultSessionTimeout !== undefined && { defaultSessionTimeout: data.defaultSessionTimeout }),
    },
    create: {
      id: 'system',
      maintenanceMode: data.maintenanceMode ?? false,
      allowPublicRegistration: data.allowPublicRegistration ?? false,
      maxInstitutionsPerPlan: data.maxInstitutionsPerPlan ?? 10,
      defaultSessionTimeout: data.defaultSessionTimeout ?? 24,
    },
  });
};
