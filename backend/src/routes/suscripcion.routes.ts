import { Router } from 'express';
import {
  getMiSuscripcionHandler,
  crearCheckoutHandler,
  crearPortalHandler,
  crearOrdenPayPalHandler,
  capturarPagoPayPalHandler,
  crearPagoAzulHandler,
  crearPagoMonCashHandler,
  capturarPagoMonCashHandler,
  crearPagoCardNetHandler,
} from '../controllers/suscripcion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';

const router = Router();

router.use(authMiddleware, resolveTenantMiddleware, requireTenantMiddleware);

router.get('/mi-suscripcion', getMiSuscripcionHandler);
router.post('/checkout', crearCheckoutHandler);
router.post('/portal', crearPortalHandler);

// PayPal
router.post('/paypal/crear-orden', crearOrdenPayPalHandler);
router.post('/paypal/capturar', capturarPagoPayPalHandler);

// AZUL
router.post('/azul/crear-pago', crearPagoAzulHandler);

// MonCash
router.post('/moncash/crear-pago', crearPagoMonCashHandler);
router.post('/moncash/capturar', capturarPagoMonCashHandler);

// CardNet
router.post('/cardnet/crear-pago', crearPagoCardNetHandler);

export default router;
