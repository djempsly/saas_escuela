import { doubleCsrf } from 'csrf-csrf';
import { Request } from 'express';

const isProd = process.env.NODE_ENV === 'production';

// Reutiliza JWT_SECRET como clave HMAC (ya validado >= 32 chars)
const CSRF_SECRET = process.env.JWT_SECRET || 'dev-csrf-secret-key-must-be-32-chars!!';

export const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,

  // Identificador de sesion: usa el Bearer token del header Authorization.
  // Para rutas sin auth (login, forgot-password) usa un fallback constante.
  // Esto es seguro porque el HMAC secret ya provee proteccion contra forgery,
  // y estas rutas tienen rate limiting estricto.
  getSessionIdentifier: (req: Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return '__anonymous__';
  },

  // __Host- prefix en produccion requiere Secure + Path=/
  cookieName: isProd ? '__Host-psifi.x-csrf-token' : 'x-csrf-token',

  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: isProd,
    httpOnly: true, // Frontend obtiene token del body, no de la cookie
  },

  // Frontend envia el token en este header
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string | undefined,

  // Solo validar en metodos mutantes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],

  errorConfig: {
    statusCode: 403,
    message: 'Token CSRF invalido o faltante',
    code: 'EBADCSRFTOKEN',
  },
});
