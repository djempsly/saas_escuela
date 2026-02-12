/**
 * User Response DTO
 * Strips sensitive fields: password, refreshTokens, auditLogs
 */
const SENSITIVE_USER_FIELDS = ['password', 'refreshTokens', 'auditLogs'];

export function toUserDTO(user: any) {
  if (!user) return user;
  const safe = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) delete safe[field];
  return safe;
}

export function toUserDTOList(users: any[]) {
  return users.map(toUserDTO);
}

/**
 * Estudiante Response DTO
 * Minimal public data for nested contexts (inscripciones, calificaciones, etc.)
 */
export function toEstudianteDTO(user: any) {
  if (!user) return user;
  return {
    id: user.id,
    nombre: user.nombre,
    ...(user.segundoNombre !== undefined && { segundoNombre: user.segundoNombre }),
    apellido: user.apellido,
    ...(user.segundoApellido !== undefined && { segundoApellido: user.segundoApellido }),
    ...(user.email !== undefined && { email: user.email }),
    ...(user.fotoUrl !== undefined && { fotoUrl: user.fotoUrl }),
  };
}
