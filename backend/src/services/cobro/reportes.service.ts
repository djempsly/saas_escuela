import prisma from '../../config/db';

// Generar reporte de pagos
export const getReportePagos = async (institucionId: string, fechaInicio: Date, fechaFin: Date) => {
  const pagos = await prisma.pago.findMany({
    where: {
      cobro: { institucionId },
      fechaPago: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    include: {
      cobro: {
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true } },
        },
      },
      registradoPor: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: { fechaPago: 'desc' },
  });

  // Calcular totales
  const totales = {
    totalRecaudado: 0,
    porMetodo: {} as Record<string, number>,
    porConcepto: {} as Record<string, number>,
    cantidadPagos: pagos.length,
  };

  for (const pago of pagos) {
    const monto = Number(pago.monto);
    totales.totalRecaudado += monto;

    // Por método de pago
    if (!totales.porMetodo[pago.metodoPago]) {
      totales.porMetodo[pago.metodoPago] = 0;
    }
    totales.porMetodo[pago.metodoPago] += monto;

    // Por concepto
    const concepto = pago.cobro.concepto;
    if (!totales.porConcepto[concepto]) {
      totales.porConcepto[concepto] = 0;
    }
    totales.porConcepto[concepto] += monto;
  }

  return {
    pagos,
    totales,
    periodo: {
      inicio: fechaInicio,
      fin: fechaFin,
    },
  };
};

// Obtener estadísticas de cobros
export const getEstadisticasCobros = async (institucionId: string, cicloLectivoId?: string) => {
  const where: any = { institucionId };
  if (cicloLectivoId) {
    where.cicloLectivoId = cicloLectivoId;
  }

  const cobros = await prisma.cobro.findMany({
    where,
    include: { pagos: true },
  });

  const estadisticas = {
    totalCobros: cobros.length,
    totalMonto: 0,
    totalRecaudado: 0,
    totalPendiente: 0,
    porEstado: {
      PENDIENTE: 0,
      PARCIAL: 0,
      PAGADO: 0,
      VENCIDO: 0,
    } as Record<string, number>,
    porConcepto: {} as Record<string, { total: number; recaudado: number }>,
  };

  for (const cobro of cobros) {
    const monto = Number(cobro.monto);
    const pagado = cobro.pagos.reduce((sum, p) => sum + Number(p.monto), 0);

    estadisticas.totalMonto += monto;
    estadisticas.totalRecaudado += pagado;
    estadisticas.porEstado[cobro.estado]++;

    // Por concepto
    if (!estadisticas.porConcepto[cobro.concepto]) {
      estadisticas.porConcepto[cobro.concepto] = { total: 0, recaudado: 0 };
    }
    estadisticas.porConcepto[cobro.concepto].total += monto;
    estadisticas.porConcepto[cobro.concepto].recaudado += pagado;
  }

  estadisticas.totalPendiente = estadisticas.totalMonto - estadisticas.totalRecaudado;

  return estadisticas;
};
