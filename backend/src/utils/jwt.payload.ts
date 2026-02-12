export interface JwtPayload {
  usuarioId: string;
  institucionId: string | null;
  rol: string;
  jti: string;
  iat?: number;
  exp?: number;
}
