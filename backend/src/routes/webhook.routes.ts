import { Router } from 'express';
import express from 'express';
import { stripeWebhookHandler, paypalWebhookHandler } from '../controllers/suscripcion.controller';

const router = Router();

router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
router.post('/paypal', express.json(), paypalWebhookHandler);

export default router;
