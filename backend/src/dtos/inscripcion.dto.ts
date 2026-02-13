/**
 * Inscripcion Response DTO
 * Cleans nested objects by removing internal fields (institucionId, FK IDs)
 */
import { toEstudianteDTO } from './user.dto';

function omit<T extends Record<string, unknown>>(obj: T, ...keys: string[]) {
  const result = { ...obj };
  for (const key of keys) delete (result as Record<string, unknown>)[key];
  return result;
}

function cleanClase(clase: Record<string, unknown>) {
  if (!clase) return clase;
  const safe = omit(clase, 'institucionId', 'materiaId', 'nivelId', 'docenteId', 'cicloLectivoId');
  if (safe.materia) safe.materia = omit(safe.materia as Record<string, unknown>, 'institucionId');
  if (safe.nivel) safe.nivel = omit(safe.nivel as Record<string, unknown>, 'institucionId');
  if (safe.cicloLectivo) safe.cicloLectivo = omit(safe.cicloLectivo as Record<string, unknown>, 'institucionId');
  return safe;
}

export function toInscripcionDTO(inscripcion: Record<string, unknown>) {
  if (!inscripcion) return inscripcion;
  const dto: Record<string, unknown> = {
    id: inscripcion.id,
    fecha: inscripcion.fecha,
    estudianteId: inscripcion.estudianteId,
    claseId: inscripcion.claseId,
    activa: inscripcion.activa,
  };
  if (inscripcion.estudiante) dto.estudiante = toEstudianteDTO(inscripcion.estudiante as Record<string, unknown>);
  if (inscripcion.clase) dto.clase = cleanClase(inscripcion.clase as Record<string, unknown>);
  return dto;
}

export function toInscripcionDTOList(inscripciones: Record<string, unknown>[]) {
  return inscripciones.map(toInscripcionDTO);
}
