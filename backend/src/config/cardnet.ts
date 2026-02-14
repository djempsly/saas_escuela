// CardNet Payment Gateway (Dominican Republic)
// Hosted payment page integration
export const CARDNET_MERCHANT_ID = process.env.CARDNET_MERCHANT_ID || '';
export const CARDNET_MERCHANT_KEY = process.env.CARDNET_MERCHANT_KEY || '';
export const CARDNET_MERCHANT_NAME = process.env.CARDNET_MERCHANT_NAME || 'LHAMS';

const isProd = process.env.NODE_ENV === 'production';
export const CARDNET_BASE_URL = isProd
  ? 'https://lab.cardnet.com.do'
  : 'https://lab.cardnet.com.do';

export const CARDNET_SUCCESS_URL = process.env.CARDNET_SUCCESS_URL || 'http://localhost:3000/dashboard/suscripcion?status=exito&gateway=cardnet';
export const CARDNET_CANCEL_URL = process.env.CARDNET_CANCEL_URL || 'http://localhost:3000/dashboard/suscripcion?status=cancelado';
