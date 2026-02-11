import { JwtPayload } from '../utils/jwt.payload';
import { Institucion } from '@prisma/client';
import type { Logger } from '../config/logger';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
    requestId?: string;
    log: Logger;
    /**
     * InstitucionId resuelto por el tenant middleware.
     * - Para usuarios regulares: viene del JWT
     * - Para ADMIN: puede venir del query param
     * - Para rutas públicas: viene del hostname/subdominio
     */
    resolvedInstitucionId?: string | null;
    /**
     * Institución completa resuelta por el public-tenant middleware.
     * Solo disponible en rutas que usan publicTenantResolver.
     */
    tenantInstitucion?: Institucion | null;
  }
}
