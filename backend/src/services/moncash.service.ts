import prisma from '../config/db';
import {
  MONCASH_CLIENT_ID,
  MONCASH_CLIENT_SECRET,
  MONCASH_API_URL,
  MONCASH_REDIRECT_URL,
} from '../config/moncash';
import { logger } from '../config/logger';
import { NotFoundError } from '../errors';

let cachedToken: { token: string; expiresAt: number } | null = null;

// In-memory store for pending MonCash orders (orderId -> metadata)
const pendingOrders = new Map<string, { institucionId: string; planId: string; frecuencia: string; monto: number }>();

/**
 * Get MonCash OAuth2 access token (cached).
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${MONCASH_CLIENT_ID}:${MONCASH_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${MONCASH_API_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'scope=read,write&grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'MonCash token request failed');
    throw new Error('Failed to get MonCash access token');
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // expire 60s early
  };

  return cachedToken.token;
}

/**
 * Create a MonCash payment order.
 * Returns a redirect URL for the user to complete payment on MonCash.
 */
export async function crearPagoMonCash(
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
  const monto = Number(precio);

  // MonCash uses unique orderId
  const orderId = `MC-${institucionId.slice(0, 8)}-${Date.now()}`;

  // Store metadata in memory for retrieval on callback
  pendingOrders.set(orderId, { institucionId, planId, frecuencia, monto });

  const token = await getAccessToken();

  const response = await fetch(`${MONCASH_API_URL}/v1/CreatePayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: monto,
      orderId,
    }),
  });

  if (!response.ok) {
    pendingOrders.delete(orderId);
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'MonCash CreatePayment failed');
    throw new Error('Error al crear pago en MonCash');
  }

  const data = (await response.json()) as { payment_token: { token: string } };
  const paymentToken = data.payment_token.token;

  const paymentUrl = `${MONCASH_REDIRECT_URL}/Payment/Redirect?token=${paymentToken}`;

  logger.info({ institucionId, planId, orderId }, 'MonCash payment created');

  return { paymentUrl, orderId };
}

/**
 * Verify a MonCash payment by transactionId (returned in callback query params).
 */
export async function capturarPagoMonCash(transactionId: string) {
  const token = await getAccessToken();

  const response = await fetch(`${MONCASH_API_URL}/v1/RetrieveTransactionPayment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transactionId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error({ status: response.status, body: errorText }, 'MonCash RetrieveTransaction failed');
    throw new Error('Error al verificar pago en MonCash');
  }

  const data = (await response.json()) as {
    payment: {
      reference: string;
      transaction_id: string;
      cost: number;
      message: string;
      payer: string;
    };
  };

  const { payment } = data;

  if (payment.message !== 'successful') {
    logger.warn({ transactionId, message: payment.message }, 'MonCash payment not successful');
    return { success: false, message: payment.message };
  }

  // Retrieve pending order metadata
  const orderMeta = pendingOrders.get(payment.reference);
  if (!orderMeta) {
    logger.error({ transactionId, reference: payment.reference }, 'MonCash pending order not found');
    return { success: false, message: 'Pending order not found' };
  }

  const { institucionId, planId, frecuencia, monto } = orderMeta;
  pendingOrders.delete(payment.reference);

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
      monto,
      moneda: 'HTG',
      estado: 'EXITOSO',
      descripcion: `MonCash - Suscripción ${frecuencia} (Tx: ${transactionId})`,
    },
  });

  logger.info({ institucionId, planId, transactionId }, 'MonCash payment confirmed');

  return { success: true, suscripcion };
}
