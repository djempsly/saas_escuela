import { Router } from 'express';
import express from 'express';
import {
  stripeWebhookHandler,
  paypalWebhookHandler,
  azulWebhookHandler,
  cardnetWebhookHandler,
} from '../controllers/suscripcion.controller';

const router = Router();

router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
router.post('/paypal', express.json(), paypalWebhookHandler);
router.post('/azul', express.urlencoded({ extended: true }), azulWebhookHandler);
router.post('/cardnet', express.json(), cardnetWebhookHandler);

export default router;
