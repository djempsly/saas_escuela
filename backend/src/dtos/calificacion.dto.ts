/**
 * Calificacion Response DTO
 * Strips internal audit fields: publicadoPor, publicadoAt, updatedAt
 */
const INTERNAL_FIELDS = ['publicadoPor', 'publicadoAt', 'updatedAt'];

export function toCalificacionDTO<T extends Record<string, unknown>>(cal: T) {
  if (!cal) return cal;
  const safe = { ...cal };
  for (const field of INTERNAL_FIELDS) delete (safe as Record<string, unknown>)[field];
  return safe;
}

export function toCalificacionDTOList<T extends Record<string, unknown>>(cals: T[]) {
  return cals.map(toCalificacionDTO);
}
