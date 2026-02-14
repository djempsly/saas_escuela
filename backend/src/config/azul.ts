// AZUL Payment Page (Dominican Republic)
// Uses a hosted payment page where customer is redirected
export const AZUL_MERCHANT_ID = process.env.AZUL_MERCHANT_ID || '';
export const AZUL_AUTH_KEY = process.env.AZUL_AUTH_KEY || '';
export const AZUL_MERCHANT_NAME = process.env.AZUL_MERCHANT_NAME || 'LHAMS';
export const AZUL_MERCHANT_TYPE = process.env.AZUL_MERCHANT_TYPE || '';

const isProd = process.env.NODE_ENV === 'production';
export const AZUL_BASE_URL = isProd
  ? 'https://pagos.azul.com.do/paymentpage'
  : 'https://pruebas.azul.com.do/paymentpage';

export const AZUL_SUCCESS_URL = process.env.AZUL_SUCCESS_URL || 'http://localhost:3000/dashboard/suscripcion?status=exito&gateway=azul';
export const AZUL_CANCEL_URL = process.env.AZUL_CANCEL_URL || 'http://localhost:3000/dashboard/suscripcion?status=cancelado';
