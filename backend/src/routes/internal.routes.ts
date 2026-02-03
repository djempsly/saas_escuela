import { Router, Request, Response } from 'express';
import { isDomainAuthorized } from '../services/domain.service';

const router = Router();

/**
 * GET /api/internal/verify-domain?domain=example.com
 *
 * Este endpoint es llamado internamente por Caddy antes de generar
 * un certificado SSL para un dominio.
 *
 * Si el dominio está autorizado (pertenece a una institución verificada),
 * responde 200 OK y Caddy genera el certificado.
 *
 * Si no está autorizado, responde 404 y Caddy rechaza la solicitud,
 * evitando que se generen certificados para dominios no autorizados.
 *
 * SEGURIDAD: Este endpoint SOLO debe ser accesible desde localhost/red interna.
 * En producción, configura el firewall para que solo Caddy pueda acceder.
 */
router.get('/verify-domain', async (req: Request, res: Response) => {
  const domain = req.query.domain as string;

  if (!domain) {
    return res.status(400).send('Missing domain parameter');
  }

  try {
    const isAuthorized = await isDomainAuthorized(domain);

    if (isAuthorized) {
      // Dominio autorizado - Caddy puede generar certificado
      return res.status(200).send('OK');
    }

    // Dominio no autorizado - Caddy NO debe generar certificado
    return res.status(404).send('Domain not authorized');
  } catch (error) {
    console.error(`[INTERNAL] Error verificando dominio ${domain}:`, error);
    // En caso de error, rechazar por seguridad
    return res.status(500).send('Internal error');
  }
});

/**
 * GET /api/internal/health
 *
 * Health check interno para monitoreo.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
