import prisma from '../config/db';
import { ForbiddenError } from '../errors';
import { Role } from '@prisma/client';

export const getPlanes = async () => {
  return prisma.plan.findMany({
    where: { activo: true },
    orderBy: { precioMensual: 'asc' },
  });
};

export const getSuscripcionByInstitucion = async (institucionId: string) => {
  return prisma.suscripcion.findUnique({
    where: { institucionId },
    include: { plan: true },
  });
};

export const verificarLimiteSuscripcion = async (institucionId: string) => {
  const suscripcion = await getSuscripcionByInstitucion(institucionId);

  if (!suscripcion || suscripcion.plan.maxEstudiantes === null) {
    return;
  }

  const max = suscripcion.plan.maxEstudiantes;

  const count = await prisma.user.count({
    where: { institucionId, role: Role.ESTUDIANTE, activo: true },
  });

  if (count >= max) {
    throw new ForbiddenError(
      `Límite de ${max} estudiantes alcanzado. Actualice su plan.`,
    );
  }
};

export const getAllSuscripciones = async (filtroEstado?: string) => {
  return prisma.suscripcion.findMany({
    where: filtroEstado ? { estado: filtroEstado as never } : {},
    include: {
      institucion: { select: { id: true, nombre: true, slug: true } },
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const asignarPlanManual = async (institucionId: string, planId: string) => {
  return prisma.suscripcion.upsert({
    where: { institucionId },
    create: { institucionId, planId, estado: 'ACTIVA', fechaInicio: new Date() },
    update: { planId, estado: 'ACTIVA', fechaInicio: new Date(), fechaFin: null, periodoGracia: null },
    include: { plan: true, institucion: { select: { id: true, nombre: true, slug: true } } },
  });
};

export const getPagosHistorial = async (institucionId: string) => {
  return prisma.pagoHistorial.findMany({
    where: { institucionId },
    orderBy: { fechaPago: 'desc' },
    include: { suscripcion: { include: { plan: true } } },
  });
};

export const verificarSuscripcionActiva = async (institucionId: string) => {
  const suscripcion = await getSuscripcionByInstitucion(institucionId);

  if (!suscripcion) {
    return false;
  }

  return suscripcion.estado === 'ACTIVA' || suscripcion.estado === 'PERIODO_GRACIA';
};
