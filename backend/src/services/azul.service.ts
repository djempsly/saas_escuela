import crypto from 'crypto';
import prisma from '../config/db';
import {
  AZUL_MERCHANT_ID,
  AZUL_AUTH_KEY,
  AZUL_MERCHANT_NAME,
  AZUL_MERCHANT_TYPE,
  AZUL_BASE_URL,
  AZUL_SUCCESS_URL,
  AZUL_CANCEL_URL,
} from '../config/azul';
import { logger } from '../config/logger';
import { NotFoundError } from '../errors';

/**
 * Create an AZUL Payment Page URL.
 * AZUL uses a redirect-based flow: we build a signed URL and redirect the user.
 */
export async function crearPagoAzul(
  institucionId: string,
  planId: string,
  frecuencia: 'mensual' | 'anual',
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.activo) {
    throw new NotFoundError('Plan no encontrado o no está activo');
  }

  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
  });
  if (!institucion) {
    throw new NotFoundError('Institución no encontrada');
  }

  const precio = frecuencia === 'mensual' ? plan.precioMensual : plan.precioAnual;
  const monto = Number(precio).toFixed(2);
  const montoSinDecimal = monto.replace('.', ''); // AZUL expects amount without decimal

  const orderNumber = `AZ-${institucionId.slice(0, 8)}-${Date.now()}`;
  const customData = JSON.stringify({ institucionId, planId, frecuencia });

  // Build AZUL auth hash: SHA512(MerchantId + MerchantName + MerchantType + CurrencyCode + OrderNumber + Amount + ApprovedUrl + DeclinedUrl + CancelUrl + UseCustomField1 + CustomField1 + AuthKey)
  const hashInput = [
    AZUL_MERCHANT_ID,
    AZUL_MERCHANT_NAME,
    AZUL_MERCHANT_TYPE,
    '$', // Currency USD
    orderNumber,
    montoSinDecimal,
    AZUL_SUCCESS_URL,
    AZUL_CANCEL_URL, // declined
    AZUL_CANCEL_URL, // cancel
    '1', // UseCustomField1
    customData,
    AZUL_AUTH_KEY,
  ].join('');

  const authHash = crypto.createHash('sha512').update(hashInput).digest('hex');

  // Build the redirect URL with query params
  const params = new URLSearchParams({
    MerchantId: AZUL_MERCHANT_ID,
    MerchantName: AZUL_MERCHANT_NAME,
    MerchantType: AZUL_MERCHANT_TYPE,
    CurrencyCode: '$',
    OrderNumber: orderNumber,
    Amount: montoSinDecimal,
    ITBIS: '000',
    ApprovedUrl: AZUL_SUCCESS_URL,
    DeclinedUrl: AZUL_CANCEL_URL,
    CancelUrl: AZUL_CANCEL_URL,
    UseCustomField1: '1',
    CustomField1: customData,
    AuthHash: authHash,
    ShowTransactionResult: '1',
  });

  const paymentUrl = `${AZUL_BASE_URL}/Default.aspx?${params.toString()}`;

  logger.info({ institucionId, planId, orderNumber }, 'AZUL payment page URL created');

  return { paymentUrl, orderNumber };
}

/**
 * Verify and process AZUL payment confirmation (POST from AZUL to our webhook).
 */
export async function procesarConfirmacionAzul(body: Record<string, string>) {
  const {
    OrderNumber: orderNumber,
    ResponseCode: responseCode,
    AuthorizationCode: authCode,
    CustomField1: customField,
    Amount: rawAmount,
    AuthHash: receivedHash,
  } = body;

  logger.info({ orderNumber, responseCode, authCode }, 'AZUL confirmation received');

  // Verify hash
  const expectedInput = [
    orderNumber || '',
    responseCode || '',
    rawAmount || '',
    authCode || '',
    AZUL_AUTH_KEY,
  ].join('');
  const expectedHash = crypto.createHash('sha512').update(expectedInput).digest('hex');

  if (receivedHash && expectedHash !== receivedHash) {
    logger.warn({ orderNumber }, 'AZUL hash verification failed');
    return { success: false, message: 'Hash verification failed' };
  }

  // ResponseCode "ISO8583" — "00" means approved
  if (responseCode !== '00') {
    logger.warn({ orderNumber, responseCode }, 'AZUL payment not approved');
    return { success: false, message: `Payment declined: ${responseCode}` };
  }

  if (!customField) {
    logger.error({ orderNumber }, 'AZUL confirmation missing custom field');
    return { success: false, message: 'Missing metadata' };
  }

  const { institucionId, planId, frecuencia } = JSON.parse(customField) as {
    institucionId: string;
    planId: string;
    frecuencia: string;
  };

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const montoCapturado = rawAmount
    ? Number(rawAmount) / 100
    : Number(plan?.[frecuencia === 'anual' ? 'precioAnual' : 'precioMensual'] ?? 0);

  const proximoPago = new Date();
  if (frecuencia === 'anual') {
    proximoPago.setFullYear(proximoPago.getFullYear() + 1);
  } else {
    proximoPago.setMonth(proximoPago.getMonth() + 1);
  }

  const suscripcion = await prisma.suscripcion.upsert({
    where: { institucionId },
    create: {
      institucionId,
      planId,
      estado: 'ACTIVA',
      fechaInicio: new Date(),
      proximoPago,
    },
    update: {
      planId,
      estado: 'ACTIVA',
      fechaInicio: new Date(),
      proximoPago,
      fechaFin: null,
      periodoGracia: null,
    },
  });

  await prisma.pagoHistorial.create({
    data: {
      suscripcionId: suscripcion.id,
      institucionId,
      monto: montoCapturado,
      moneda: 'USD',
      estado: 'EXITOSO',
      descripcion: `AZUL - Suscripción ${frecuencia} (Auth: ${authCode || 'N/A'})`,
    },
  });

  logger.info({ institucionId, planId, orderNumber }, 'AZUL payment confirmed, subscription activated');

  return { success: true, suscripcion };
}
