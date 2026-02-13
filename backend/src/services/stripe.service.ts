import Stripe from 'stripe';
import prisma from '../config/db';
import { stripe, STRIPE_WEBHOOK_SECRET, STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL } from '../config/stripe';
import { logger } from '../config/logger';
import { NotFoundError } from '../errors';
import { crearNotificacionesMasivas } from './notificacion.service';
import { emitirNotificacion } from './socket-emitter.service';

export async function crearCheckoutSession(
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
    include: { director: true },
  });
  if (!institucion) {
    throw new NotFoundError('Institución no encontrada');
  }

  const suscripcionExistente = await prisma.suscripcion.findUnique({
    where: { institucionId },
  });

  const precio = frecuencia === 'mensual' ? plan.precioMensual : plan.precioAnual;
  const interval: 'month' | 'year' = frecuencia === 'mensual' ? 'month' : 'year';

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(precio) * 100),
          recurring: { interval },
          product_data: { name: `${plan.nombre} (${frecuencia})` },
        },
        quantity: 1,
      },
    ],
    metadata: { institucionId, planId, frecuencia },
    success_url: STRIPE_SUCCESS_URL,
    cancel_url: STRIPE_CANCEL_URL,
  };

  if (suscripcionExistente?.stripeCustomerId) {
    sessionParams.customer = suscripcionExistente.stripeCustomerId;
  } else if (institucion.director.email) {
    sessionParams.customer_email = institucion.director.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url };
}

export async function crearPortalSession(stripeCustomerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: STRIPE_SUCCESS_URL,
  });
  return { url: session.url };
}

export async function procesarWebhook(payload: Buffer, signature: string) {
  const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    default:
      logger.info({ type: event.type }, 'Evento Stripe no manejado');
  }
}

/**
 * Extract the subscription ID from an Invoice's parent field (Stripe v20+).
 */
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
}

/**
 * Get the current_period_end from the first subscription item (Stripe v20+).
 */
function getPeriodEndFromSubscription(subscription: Stripe.Subscription): Date {
  const firstItem = subscription.items?.data?.[0];
  if (firstItem?.current_period_end) {
    return new Date(firstItem.current_period_end * 1000);
  }
  // Fallback: use billing_cycle_anchor + 30 days
  return new Date(subscription.billing_cycle_anchor * 1000 + 30 * 24 * 60 * 60 * 1000);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { institucionId, planId, frecuencia } = session.metadata ?? {};
  if (!institucionId || !planId) {
    logger.warn({ sessionId: session.id }, 'Checkout sin metadata de institución/plan');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const currentPeriodEnd = getPeriodEndFromSubscription(subscription);

  const precio = frecuencia === 'anual'
    ? (await prisma.plan.findUnique({ where: { id: planId } }))?.precioAnual
    : (await prisma.plan.findUnique({ where: { id: planId } }))?.precioMensual;

  const suscripcion = await prisma.suscripcion.upsert({
    where: { institucionId },
    create: {
      institucionId,
      planId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      estado: 'ACTIVA',
      fechaInicio: new Date(),
      proximoPago: currentPeriodEnd,
    },
    update: {
      planId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      estado: 'ACTIVA',
      fechaInicio: new Date(),
      proximoPago: currentPeriodEnd,
      fechaFin: null,
      periodoGracia: null,
    },
  });

  await prisma.pagoHistorial.create({
    data: {
      suscripcionId: suscripcion.id,
      institucionId,
      monto: precio ?? 0,
      moneda: 'USD',
      stripePaymentIntentId: session.payment_intent as string | null,
      estado: 'EXITOSO',
      descripcion: `Suscripción ${frecuencia} - Checkout inicial`,
    },
  });

  logger.info({ institucionId, planId }, 'Checkout completado, suscripción activada');
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!stripeSubscriptionId) return;

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!suscripcion) {
    logger.warn({ stripeSubscriptionId }, 'Pago exitoso para suscripción no encontrada');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currentPeriodEnd = getPeriodEndFromSubscription(subscription);

  await prisma.suscripcion.update({
    where: { id: suscripcion.id },
    data: {
      estado: 'ACTIVA',
      proximoPago: currentPeriodEnd,
      periodoGracia: null,
    },
  });

  await prisma.pagoHistorial.create({
    data: {
      suscripcionId: suscripcion.id,
      institucionId: suscripcion.institucionId,
      monto: (invoice.amount_paid ?? 0) / 100,
      moneda: invoice.currency?.toUpperCase() ?? 'USD',
      stripePaymentIntentId: null,
      estado: 'EXITOSO',
      descripcion: 'Pago recurrente exitoso',
    },
  });

  logger.info({ suscripcionId: suscripcion.id }, 'Pago recurrente exitoso');
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!stripeSubscriptionId) return;

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { stripeSubscriptionId },
  });
  if (!suscripcion) {
    logger.warn({ stripeSubscriptionId }, 'Pago fallido para suscripción no encontrada');
    return;
  }

  const periodoGracia = new Date();
  periodoGracia.setDate(periodoGracia.getDate() + 7);

  await prisma.suscripcion.update({
    where: { id: suscripcion.id },
    data: { estado: 'VENCIDA', periodoGracia },
  });

  await prisma.pagoHistorial.create({
    data: {
      suscripcionId: suscripcion.id,
      institucionId: suscripcion.institucionId,
      monto: (invoice.amount_due ?? 0) / 100,
      moneda: invoice.currency?.toUpperCase() ?? 'USD',
      stripePaymentIntentId: null,
      estado: 'FALLIDO',
      descripcion: 'Pago recurrente fallido',
    },
  });

  // Notificar al director
  const institucion = await prisma.institucion.findUnique({
    where: { id: suscripcion.institucionId },
    select: { directorId: true },
  });

  if (institucion) {
    const titulo = 'Pago de suscripción fallido';
    const mensaje =
      'El pago de su suscripción ha fallido. Tiene 7 días de gracia para actualizar su método de pago antes de que se suspenda el servicio.';

    await crearNotificacionesMasivas([institucion.directorId], titulo, mensaje);
    emitirNotificacion(institucion.directorId, {
      tipo: 'suscripcion',
      titulo,
      mensaje,
      timestamp: new Date().toISOString(),
    });
  }

  logger.info({ suscripcionId: suscripcion.id }, 'Pago recurrente fallido, suscripción vencida');
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const suscripcion = await prisma.suscripcion.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!suscripcion) {
    logger.warn({ stripeSubscriptionId: subscription.id }, 'Suscripción eliminada no encontrada');
    return;
  }

  await prisma.suscripcion.update({
    where: { id: suscripcion.id },
    data: { estado: 'CANCELADA', fechaFin: new Date() },
  });

  logger.info({ suscripcionId: suscripcion.id }, 'Suscripción cancelada en Stripe');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const newPlanId = subscription.metadata?.planId;
  if (!newPlanId) return;

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!suscripcion) return;

  if (suscripcion.planId !== newPlanId) {
    await prisma.suscripcion.update({
      where: { id: suscripcion.id },
      data: { planId: newPlanId },
    });
    logger.info({ suscripcionId: suscripcion.id, newPlanId }, 'Plan actualizado desde Stripe');
  }
}
