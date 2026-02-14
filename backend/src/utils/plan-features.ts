/**
 * Tipo para las features del plan almacenadas como JSON en la BD.
 *
 * Formato nuevo (objeto):
 *   { items: string[], dominioPropio: boolean, maxImagenesActividad: number, maxVideosActividad: number }
 *
 * Formato legacy (array de strings):
 *   ['gestion_academica', 'calificaciones', ...]
 */
export interface PlanFeatures {
  items: string[];
  dominioPropio: boolean;
  maxImagenesActividad: number;
  maxVideosActividad: number;
}

const DEFAULTS: PlanFeatures = {
  items: [],
  dominioPropio: false,
  maxImagenesActividad: 5,
  maxVideosActividad: 0,
};

/**
 * Parsea el campo `features` (Json) de un plan.
 * Soporta tanto el formato nuevo (objeto) como el legacy (array de strings).
 */
export function parsePlanFeatures(features: unknown): PlanFeatures {
  if (!features) return DEFAULTS;

  // Legacy: array of strings
  if (Array.isArray(features)) {
    return { ...DEFAULTS, items: features as string[] };
  }

  // New format: object
  if (typeof features === 'object') {
    const obj = features as Record<string, unknown>;
    return {
      items: Array.isArray(obj.items) ? (obj.items as string[]) : DEFAULTS.items,
      dominioPropio: typeof obj.dominioPropio === 'boolean' ? obj.dominioPropio : DEFAULTS.dominioPropio,
      maxImagenesActividad: typeof obj.maxImagenesActividad === 'number' ? obj.maxImagenesActividad : DEFAULTS.maxImagenesActividad,
      maxVideosActividad: typeof obj.maxVideosActividad === 'number' ? obj.maxVideosActividad : DEFAULTS.maxVideosActividad,
    };
  }

  return DEFAULTS;
}
