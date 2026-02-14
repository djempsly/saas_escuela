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

export const getDashboardSuscripciones = async () => {
  // All active institutions with their subscription (LEFT JOIN via optional relation)
  const instituciones = await prisma.institucion.findMany({
    where: { activo: true },
    select: {
      id: true,
      nombre: true,
      slug: true,
      suscripcion: {
        include: { plan: true },
      },
    },
    orderBy: { nombre: 'asc' },
  });

  // Count active students per institution
  const estudiantesCounts = await prisma.user.groupBy({
    by: ['institucionId'],
    where: { role: Role.ESTUDIANTE, activo: true },
    _count: { id: true },
  });
  const estudiantesMap = new Map(
    estudiantesCounts.map((e) => [e.institucionId, e._count.id]),
  );

  // Total income (all successful payments)
  const ingresosTotales = await prisma.pagoHistorial.aggregate({
    where: { estado: 'EXITOSO' },
    _sum: { monto: true },
  });

  // Income this month
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const ingresosMes = await prisma.pagoHistorial.aggregate({
    where: { estado: 'EXITOSO', fechaPago: { gte: inicioMes } },
    _sum: { monto: true },
  });

  // Last payment per institution
  const ultimosPagos = await prisma.pagoHistorial.findMany({
    where: { estado: 'EXITOSO' },
    orderBy: { fechaPago: 'desc' },
    distinct: ['institucionId'],
    select: {
      institucionId: true,
      monto: true,
      fechaPago: true,
    },
  });
  const ultimoPagoMap = new Map(
    ultimosPagos.map((p) => [p.institucionId, { monto: p.monto, fechaPago: p.fechaPago }]),
  );

  const items = instituciones.map((inst) => ({
    id: inst.id,
    nombre: inst.nombre,
    slug: inst.slug,
    suscripcion: inst.suscripcion,
    estudiantes: estudiantesMap.get(inst.id) || 0,
    maxEstudiantes: inst.suscripcion?.plan?.maxEstudiantes ?? null,
    ultimoPago: ultimoPagoMap.get(inst.id) || null,
  }));

  return {
    items,
    ingresosTotales: ingresosTotales._sum.monto?.toNumber() ?? 0,
    ingresosMes: ingresosMes._sum.monto?.toNumber() ?? 0,
  };
};

export const verificarSuscripcionActiva = async (institucionId: string) => {
  const suscripcion = await getSuscripcionByInstitucion(institucionId);

  if (!suscripcion) {
    return false;
  }

  return suscripcion.estado === 'ACTIVA' || suscripcion.estado === 'PERIODO_GRACIA';
};
