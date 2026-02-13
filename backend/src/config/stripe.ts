import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_SUCCESS_URL =
  process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/suscripcion/exito';
export const STRIPE_CANCEL_URL =
  process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/suscripcion/cancelado';
