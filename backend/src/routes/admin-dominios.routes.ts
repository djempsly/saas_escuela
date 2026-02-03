import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';
import {
  registrarDominio,
  forzarVerificacion,
  getDominiosByInstitucion,
  eliminarDominio,
} from '../services/domain.service';

const router = Router();

// Todas las rutas requieren autenticación y rol de ADMIN o DIRECTOR
router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
  requireTenantMiddleware
);

/**
 * GET /api/admin/dominios
 *
 * Lista todos los dominios personalizados de la institución.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dominios = await getDominiosByInstitucion(req.resolvedInstitucionId!);
    res.json(dominios);
  } catch (error) {
    console.error('[DOMINIOS] Error listando dominios:', error);
    res.status(500).json({ error: 'Error al obtener dominios' });
  }
});

/**
 * POST /api/admin/dominios
 *
 * Registra un nuevo dominio personalizado.
 *
 * Body: { dominio: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { dominio } = req.body;

    if (!dominio || typeof dominio !== 'string') {
      return res.status(400).json({ error: 'El campo dominio es requerido' });
    }

    const resultado = await registrarDominio(req.resolvedInstitucionId!, dominio);
    res.status(201).json(resultado);
  } catch (error: unknown) {
    console.error('[DOMINIOS] Error registrando dominio:', error);
    const message = error instanceof Error ? error.message : 'Error al registrar dominio';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/admin/dominios/:id/verificar
 *
 * Fuerza la verificación DNS de un dominio.
 */
router.post('/:id/verificar', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const resultado = await forzarVerificacion(req.params.id, req.resolvedInstitucionId!);
    res.json(resultado);
  } catch (error: unknown) {
    console.error('[DOMINIOS] Error verificando dominio:', error);
    const message = error instanceof Error ? error.message : 'Error al verificar dominio';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/admin/dominios/:id
 *
 * Elimina un dominio personalizado.
 */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const resultado = await eliminarDominio(req.params.id, req.resolvedInstitucionId!);
    res.json(resultado);
  } catch (error: unknown) {
    console.error('[DOMINIOS] Error eliminando dominio:', error);
    const message = error instanceof Error ? error.message : 'Error al eliminar dominio';
    res.status(400).json({ error: message });
  }
});

export default router;
