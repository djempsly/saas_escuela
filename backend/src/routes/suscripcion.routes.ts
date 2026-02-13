import { Router } from 'express';
import { getMiSuscripcionHandler, crearCheckoutHandler, crearPortalHandler } from '../controllers/suscripcion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';

const router = Router();

router.use(authMiddleware, resolveTenantMiddleware, requireTenantMiddleware);

router.get('/mi-suscripcion', getMiSuscripcionHandler);
router.post('/checkout', crearCheckoutHandler);
router.post('/portal', crearPortalHandler);

export default router;
