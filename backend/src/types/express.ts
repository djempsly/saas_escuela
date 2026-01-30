import { JwtPayload } from '../utils/jwt.payload';

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
      /**
       * InstitucionId resuelto por el tenant middleware.
       * - Para usuarios regulares: viene del JWT
       * - Para ADMIN: puede venir del query param
       */
      resolvedInstitucionId?: string | null;
    }
  }
}

export {};
