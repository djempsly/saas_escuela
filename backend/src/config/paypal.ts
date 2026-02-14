import { Client, Environment } from '@paypal/paypal-server-sdk';

const isProd = process.env.NODE_ENV === 'production';

export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || '',
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  },
  environment: isProd ? Environment.Production : Environment.Sandbox,
});

export const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

export const PAYPAL_SUCCESS_URL =
  process.env.PAYPAL_SUCCESS_URL || 'http://localhost:3000/dashboard/suscripcion?status=exito';
export const PAYPAL_CANCEL_URL =
  process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/dashboard/suscripcion?status=cancelado';
