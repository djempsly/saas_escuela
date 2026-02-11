export interface JwtPayload {
  usuarioId: string;
  institucionId: string | null;
  rol: string;
}
