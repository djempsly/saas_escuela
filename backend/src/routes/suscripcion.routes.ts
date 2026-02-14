import { Router } from 'express';
import { getMiSuscripcionHandler, crearCheckoutHandler, crearPortalHandler, crearOrdenPayPalHandler, capturarPagoPayPalHandler } from '../controllers/suscripcion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';

const router = Router();

router.use(authMiddleware, resolveTenantMiddleware, requireTenantMiddleware);

router.get('/mi-suscripcion', getMiSuscripcionHandler);
router.post('/checkout', crearCheckoutHandler);
router.post('/portal', crearPortalHandler);
router.post('/paypal/crear-orden', crearOrdenPayPalHandler);
router.post('/paypal/capturar', capturarPagoPayPalHandler);

export default router;
