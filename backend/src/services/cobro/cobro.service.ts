import prisma from '../../config/db';
import { ConceptoCobro, EstadoPago, MetodoPago } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors';
import { sanitizeOptional } from '../../utils/sanitize';

// Interfaces
interface CrearCobroInput {
  concepto: ConceptoCobro;
  descripcion?: string;
  monto: number;
  fechaVencimiento: Date;
  estudianteId: string;
  cicloLectivoId: string;
}

interface CrearCobroMasivoInput {
  concepto: ConceptoCobro;
  descripcion?: string;
  monto: number;
  fechaVencimiento: Date;
  estudianteIds: string[];
  cicloLectivoId: string;
}

interface RegistrarPagoInput {
  monto: number;
  metodoPago: MetodoPago;
  referencia?: string;
  comprobanteUrl?: string;
}

// Crear cobro individual
export const crearCobro = async (input: CrearCobroInput, institucionId: string) => {
  // Verificar que el estudiante existe y pertenece a la institución
  const estudiante = await prisma.user.findFirst({
    where: {
      id: input.estudianteId,
      institucionId,
      role: 'ESTUDIANTE',
    },
  });

  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado');
  }

  // Verificar ciclo lectivo
  const ciclo = await prisma.cicloLectivo.findFirst({
    where: {
      id: input.cicloLectivoId,
      institucionId,
    },
  });

  if (!ciclo) {
    throw new NotFoundError('Ciclo lectivo no encontrado');
  }

  return prisma.cobro.create({
    data: {
      concepto: input.concepto,
      descripcion: sanitizeOptional(input.descripcion),
      monto: input.monto,
      fechaVencimiento: new Date(input.fechaVencimiento),
      estado: EstadoPago.PENDIENTE,
      estudianteId: input.estudianteId,
      institucionId,
      cicloLectivoId: input.cicloLectivoId,
    },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true } },
      cicloLectivo: { select: { id: true, nombre: true } },
    },
  });
};

// Crear cobros masivos
export const crearCobrosMasivos = async (input: CrearCobroMasivoInput, institucionId: string) => {
  // Verificar ciclo lectivo
  const ciclo = await prisma.cicloLectivo.findFirst({
    where: {
      id: input.cicloLectivoId,
      institucionId,
    },
  });

  if (!ciclo) {
    throw new NotFoundError('Ciclo lectivo no encontrado');
  }

  // Verificar estudiantes
  const estudiantes = await prisma.user.findMany({
    where: {
      id: { in: input.estudianteIds },
      institucionId,
      role: 'ESTUDIANTE',
    },
    select: { id: true },
  });

  if (estudiantes.length !== input.estudianteIds.length) {
    throw new NotFoundError('Uno o más estudiantes no encontrados');
  }

  const cobros = await prisma.cobro.createMany({
    data: estudiantes.map((est) => ({
      concepto: input.concepto,
      descripcion: sanitizeOptional(input.descripcion),
      monto: input.monto,
      fechaVencimiento: new Date(input.fechaVencimiento),
      estado: EstadoPago.PENDIENTE,
      estudianteId: est.id,
      institucionId,
      cicloLectivoId: input.cicloLectivoId,
    })),
  });

  return { creados: cobros.count };
};

// Obtener cobros (con filtros)
export const getCobros = async (
  institucionId: string,
  filtros?: {
    estado?: EstadoPago;
    concepto?: ConceptoCobro;
    estudianteId?: string;
    cicloLectivoId?: string;
    nivelId?: string;
  },
) => {
  const where: Record<string, unknown> = { institucionId };

  if (filtros?.estado) {
    where.estado = filtros.estado;
  }

  if (filtros?.concepto) {
    where.concepto = filtros.concepto;
  }

  if (filtros?.estudianteId) {
    where.estudianteId = filtros.estudianteId;
  }

  if (filtros?.cicloLectivoId) {
    where.cicloLectivoId = filtros.cicloLectivoId;
  }

  if (filtros?.nivelId) {
    where.estudiante = {
      inscripciones: {
        some: {
          clase: { nivelId: filtros.nivelId },
        },
      },
    };
  }

  return prisma.cobro.findMany({
    where,
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true } },
      cicloLectivo: { select: { id: true, nombre: true } },
      pagos: {
        include: {
          registradoPor: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
    orderBy: { fechaVencimiento: 'asc' },
  });
};

// Obtener cobros de un estudiante
export const getCobrosByEstudiante = async (
  estudianteId: string,
  institucionId: string,
  usuarioId: string,
  role: string,
) => {
  // Verificar acceso
  if (role === 'ESTUDIANTE' && usuarioId !== estudianteId) {
    throw new ForbiddenError('No autorizado');
  }

  const estudiante = await prisma.user.findFirst({
    where: {
      id: estudianteId,
      institucionId,
    },
  });

  if (!estudiante) {
    throw new NotFoundError('Estudiante no encontrado');
  }

  const cobros = await prisma.cobro.findMany({
    where: {
      estudianteId,
      institucionId,
    },
    include: {
      cicloLectivo: { select: { id: true, nombre: true } },
      pagos: {
        orderBy: { fechaPago: 'desc' },
      },
    },
    orderBy: { fechaVencimiento: 'desc' },
  });

  // Calcular totales
  const totales = {
    pendiente: 0,
    pagado: 0,
  };

  for (const cobro of cobros) {
    const montoPagado = cobro.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
    const montoTotal = Number(cobro.monto);

    if (cobro.estado === EstadoPago.PAGADO) {
      totales.pagado += montoTotal;
    } else {
      totales.pendiente += montoTotal - montoPagado;
    }
  }

  return {
    estudiante: {
      id: estudiante.id,
      nombre: estudiante.nombre,
      apellido: estudiante.apellido,
    },
    cobros,
    totales,
  };
};

// Obtener cobros pendientes
export const getCobrosPendientes = async (institucionId: string) => {
  const hoy = new Date();

  // Actualizar estado de cobros vencidos
  await prisma.cobro.updateMany({
    where: {
      institucionId,
      estado: EstadoPago.PENDIENTE,
      fechaVencimiento: { lt: hoy },
    },
    data: { estado: EstadoPago.VENCIDO },
  });

  return prisma.cobro.findMany({
    where: {
      institucionId,
      estado: { in: [EstadoPago.PENDIENTE, EstadoPago.PARCIAL, EstadoPago.VENCIDO] },
    },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true } },
      cicloLectivo: { select: { id: true, nombre: true } },
      pagos: true,
    },
    orderBy: [{ estado: 'asc' }, { fechaVencimiento: 'asc' }],
  });
};

// Registrar pago
export const registrarPago = async (
  cobroId: string,
  input: RegistrarPagoInput,
  registradoPorId: string,
  institucionId: string,
) => {
  const cobro = await prisma.cobro.findFirst({
    where: { id: cobroId, institucionId },
    include: { pagos: true },
  });

  if (!cobro) {
    throw new NotFoundError('Cobro no encontrado');
  }

  if (cobro.estado === EstadoPago.PAGADO) {
    throw new ValidationError('Este cobro ya está pagado completamente');
  }

  // Calcular monto pendiente
  const montoPagado = cobro.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const montoPendiente = Number(cobro.monto) - montoPagado;

  if (input.monto > montoPendiente) {
    throw new ValidationError(`El monto máximo a pagar es ${montoPendiente}`);
  }

  if (input.monto <= 0) {
    throw new ValidationError('El monto debe ser mayor a 0');
  }

  // Crear el pago
  const pago = await prisma.pago.create({
    data: {
      monto: input.monto,
      metodoPago: input.metodoPago,
      referencia: input.referencia,
      comprobanteUrl: input.comprobanteUrl,
      cobroId,
      registradoPorId,
    },
    include: {
      registradoPor: { select: { id: true, nombre: true, apellido: true } },
    },
  });

  // Actualizar estado del cobro
  const nuevoMontoPagado = montoPagado + input.monto;
  let nuevoEstado: EstadoPago;

  if (nuevoMontoPagado >= Number(cobro.monto)) {
    nuevoEstado = EstadoPago.PAGADO;
  } else {
    nuevoEstado = EstadoPago.PARCIAL;
  }

  await prisma.cobro.update({
    where: { id: cobroId },
    data: { estado: nuevoEstado },
  });

  return {
    pago,
    cobro: await prisma.cobro.findUnique({
      where: { id: cobroId },
      include: {
        estudiante: { select: { id: true, nombre: true, apellido: true } },
        pagos: true,
      },
    }),
  };
};

// Obtener detalle de cobro
export const getCobroById = async (cobroId: string, institucionId: string) => {
  const cobro = await prisma.cobro.findFirst({
    where: { id: cobroId, institucionId },
    include: {
      estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
      cicloLectivo: { select: { id: true, nombre: true } },
      institucion: { select: { id: true, nombre: true, logoUrl: true, direccion: true } },
      pagos: {
        include: {
          registradoPor: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { fechaPago: 'desc' },
      },
    },
  });

  if (!cobro) {
    throw new NotFoundError('Cobro no encontrado');
  }

  // Calcular saldo pendiente
  const montoPagado = cobro.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const saldoPendiente = Number(cobro.monto) - montoPagado;

  return {
    ...cobro,
    montoPagado,
    saldoPendiente,
  };
};

// Obtener conceptos de cobro disponibles
export const getConceptosCobro = () => {
  return Object.values(ConceptoCobro);
};

// Obtener métodos de pago disponibles
export const getMetodosPago = () => {
  return Object.values(MetodoPago);
};
