import { Router } from 'express';
import express from 'express';
import { stripeWebhookHandler } from '../controllers/suscripcion.controller';

const router = Router();

router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

export default router;
