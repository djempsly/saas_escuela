/**
 * Inscripcion Response DTO
 * Cleans nested objects by removing internal fields (institucionId, FK IDs)
 */
import { toEstudianteDTO } from './user.dto';

function omit(obj: any, ...keys: string[]) {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

function cleanClase(clase: any) {
  if (!clase) return clase;
  const safe = omit(clase, 'institucionId', 'materiaId', 'nivelId', 'docenteId', 'cicloLectivoId');
  if (safe.materia) safe.materia = omit(safe.materia, 'institucionId');
  if (safe.nivel) safe.nivel = omit(safe.nivel, 'institucionId');
  if (safe.cicloLectivo) safe.cicloLectivo = omit(safe.cicloLectivo, 'institucionId');
  return safe;
}

export function toInscripcionDTO(inscripcion: any) {
  if (!inscripcion) return inscripcion;
  const dto: any = {
    id: inscripcion.id,
    fecha: inscripcion.fecha,
    estudianteId: inscripcion.estudianteId,
    claseId: inscripcion.claseId,
  };
  if (inscripcion.estudiante) dto.estudiante = toEstudianteDTO(inscripcion.estudiante);
  if (inscripcion.clase) dto.clase = cleanClase(inscripcion.clase);
  return dto;
}

export function toInscripcionDTOList(inscripciones: any[]) {
  return inscripciones.map(toInscripcionDTO);
}
