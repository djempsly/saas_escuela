import crypto from 'crypto';
import prisma from '../config/db';
import {
  CARDNET_MERCHANT_ID,
  CARDNET_MERCHANT_KEY,
  CARDNET_BASE_URL,
  CARDNET_SUCCESS_URL,
  CARDNET_CANCEL_URL,
} from '../config/cardnet';
import { logger } from '../config/logger';
import { NotFoundError } from '../errors';

/**
 * Create a CardNet payment request.
 * CardNet uses a hosted payment page — we POST to their API to get a session/redirect URL.
 */
export async function crearPagoCardNet(
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

  const invoiceNumber = `CN-${institucionId.slice(0, 8)}-${Date.now()}`;
  const customData = JSON.stringify({ institucionId, planId, frecuencia });

  // CardNet authentication: HMAC-SHA256 of the request body with merchant key
  const requestBody = {
    TransactionType: 'Sale',
    MerchantId: CARDNET_MERCHANT_ID,
    MerchantName: 'LHAMS',
    InvoiceNumber: invoiceNumber,
    CurrencyCode: '840', // USD
    Amount: Math.round(Number(monto) * 100), // cents
    Tax: 0,
    ReturnUrl: CARDNET_SUCCESS_URL,
    CancelUrl: CARDNET_CANCEL_URL,
    CustomField1: customData,
    Description: `${plan.nombre} (${frecuencia})`,
  };

  const bodyString = JSON.stringify(requestBody);
  const signature = crypto
    .createHmac('sha256', CARDNET_MERCHANT_KEY)
    .update(bodyString)
    .digest('hex');

  const response = await fetch(`${CARDNET_BASE_URL}/api/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CARDNET_MERCHANT_KEY}`,
      'X-Signature': signature,
    },
    body: bodyString,
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'CardNet create payment failed');
    throw new Error('Error al crear pago en CardNet');
  }

  const data = (await response.json()) as {
    sessionId: string;
    redirectUrl: string;
  };

  logger.info({ institucionId, planId, invoiceNumber }, 'CardNet payment session created');

  return {
    paymentUrl: data.redirectUrl,
    sessionId: data.sessionId,
    invoiceNumber,
  };
}

/**
 * Verify and process CardNet payment confirmation (webhook/callback POST).
 */
export async function procesarConfirmacionCardNet(body: Record<string, string>) {
  const {
    InvoiceNumber: invoiceNumber,
    ResponseCode: responseCode,
    AuthorizationCode: authCode,
    CustomField1: customField,
    Amount: rawAmount,
    Signature: receivedSignature,
  } = body;

  logger.info({ invoiceNumber, responseCode, authCode }, 'CardNet confirmation received');

  // Verify signature
  if (receivedSignature) {
    const verifyInput = `${invoiceNumber}${responseCode}${rawAmount}${CARDNET_MERCHANT_KEY}`;
    const expectedSignature = crypto
      .createHmac('sha256', CARDNET_MERCHANT_KEY)
      .update(verifyInput)
      .digest('hex');

    if (expectedSignature !== receivedSignature) {
      logger.warn({ invoiceNumber }, 'CardNet signature verification failed');
      return { success: false, message: 'Signature verification failed' };
    }
  }

  // "00" means approved
  if (responseCode !== '00') {
    logger.warn({ invoiceNumber, responseCode }, 'CardNet payment not approved');
    return { success: false, message: `Payment declined: ${responseCode}` };
  }

  if (!customField) {
    logger.error({ invoiceNumber }, 'CardNet confirmation missing custom field');
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
      descripcion: `CardNet - Suscripción ${frecuencia} (Auth: ${authCode || 'N/A'})`,
    },
  });

  logger.info({ institucionId, planId, invoiceNumber }, 'CardNet payment confirmed, subscription activated');

  return { success: true, suscripcion };
}
