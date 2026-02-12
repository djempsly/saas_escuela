/**
 * Calificacion Response DTO
 * Strips internal audit fields: publicadoPor, publicadoAt, updatedAt
 */
const INTERNAL_FIELDS = ['publicadoPor', 'publicadoAt', 'updatedAt'];

export function toCalificacionDTO(cal: any) {
  if (!cal) return cal;
  const safe = { ...cal };
  for (const field of INTERNAL_FIELDS) delete safe[field];
  return safe;
}

export function toCalificacionDTOList(cals: any[]) {
  return cals.map(toCalificacionDTO);
}
