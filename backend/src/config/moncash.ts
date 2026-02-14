// MonCash Payment Gateway (Haiti)
// REST API with OAuth2 authentication
export const MONCASH_CLIENT_ID = process.env.MONCASH_CLIENT_ID || '';
export const MONCASH_CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET || '';

const isProd = process.env.NODE_ENV === 'production';
export const MONCASH_BASE_URL = isProd
  ? 'https://moncashbutton.digicelgroup.com'
  : 'https://sandbox.moncashbutton.digicelgroup.com';

export const MONCASH_API_URL = `${MONCASH_BASE_URL}/Api`;
export const MONCASH_REDIRECT_URL = `${MONCASH_BASE_URL}/Moncash-middleware`;

export const MONCASH_SUCCESS_URL = process.env.MONCASH_SUCCESS_URL || 'http://localhost:3000/dashboard/suscripcion?status=exito&gateway=moncash';
export const MONCASH_CANCEL_URL = process.env.MONCASH_CANCEL_URL || 'http://localhost:3000/dashboard/suscripcion?status=cancelado';
