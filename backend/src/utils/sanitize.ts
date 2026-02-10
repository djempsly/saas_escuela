import sanitizeHtml from 'sanitize-html';

/**
 * Limpia texto libre eliminando todo HTML malicioso.
 * Permite solo texto plano — no deja pasar ninguna etiqueta.
 *
 * Uso: llamar antes de cada create/update de Prisma en campos de texto libre
 * (observaciones, comentarios, descripcion, mensajes, contenido, titulo).
 */
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape',
  }).trim();
}

/**
 * Variante que acepta string | undefined | null y preserva el tipo.
 * Útil para campos opcionales en updates parciales.
 */
export function sanitizeOptional<T extends string | undefined | null>(input: T): T {
  if (input == null) return input;
  return sanitizeText(input) as T;
}
