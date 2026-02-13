import { Request, Response } from 'express';
import { z } from 'zod';
import { getPlanes, getSuscripcionByInstitucion, getAllSuscripciones, asignarPlanManual, getPagosHistorial } from '../services/suscripcion.service';
import { crearCheckoutSession, crearPortalSession, procesarWebhook } from '../services/stripe.service';
import { sanitizeErrorMessage } from '../utils/security';

export const getPlanesHandler = async (_req: Request, res: Response) => {
  try {
    const planes = await getPlanes();
    return res.status(200).json(planes);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getMiSuscripcionHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const suscripcion = await getSuscripcionByInstitucion(req.resolvedInstitucionId);
    return res.status(200).json(suscripcion);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

const checkoutSchema = z.object({
  planId: z.string(),
  frecuencia: z.enum(['mensual', 'anual']),
});

export const crearCheckoutHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const { planId, frecuencia } = parsed.data;
    const result = await crearCheckoutSession(req.resolvedInstitucionId, planId, frecuencia);
    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const crearPortalHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const suscripcion = await getSuscripcionByInstitucion(req.resolvedInstitucionId);
    if (!suscripcion?.stripeCustomerId) {
      return res.status(400).json({ message: 'No hay suscripción con Stripe asociada' });
    }

    const result = await crearPortalSession(suscripcion.stripeCustomerId);
    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// ===== Admin handlers =====

export const getAllSuscripcionesHandler = async (req: Request, res: Response) => {
  try {
    const estado = req.query.estado as string | undefined;
    const suscripciones = await getAllSuscripciones(estado);
    return res.status(200).json(suscripciones);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

const asignarPlanSchema = z.object({
  institucionId: z.string(),
  planId: z.string(),
});

export const asignarPlanManualHandler = async (req: Request, res: Response) => {
  try {
    const parsed = asignarPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
    }
    const { institucionId, planId } = parsed.data;
    const suscripcion = await asignarPlanManual(institucionId, planId);
    return res.status(200).json(suscripcion);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const getPagosHistorialHandler = async (req: Request, res: Response) => {
  try {
    const institucionId = req.params.institucionId as string;
    if (!institucionId) {
      return res.status(400).json({ message: 'institucionId es requerido' });
    }
    const pagos = await getPagosHistorial(institucionId);
    return res.status(200).json(pagos);
  } catch (error: unknown) {
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ message: 'Falta stripe-signature header' });
    }

    await procesarWebhook(req.body as Buffer, signature);
    return res.status(200).json({ received: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('signature')) {
      return res.status(400).json({ message: 'Firma de webhook inválida' });
    }
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
