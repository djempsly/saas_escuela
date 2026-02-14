import dns from 'dns/promises';
import prisma from '../config/db';
import { logger } from '../config/logger';
import { ConflictError, NotFoundError, ValidationError } from '../errors';
import { parsePlanFeatures } from '../utils/plan-features';

const SERVER_IP = process.env.SERVER_IP;
const BASE_DOMAIN = process.env.BASE_DOMAIN;

interface VerificacionResult {
  verificado: boolean;
  mensaje: string;
}

/**
 * Verifica si un dominio apunta correctamente al servidor.
 * Intenta verificar por CNAME primero, luego por registro A.
 */
async function verificarDominio(dominio: string): Promise<VerificacionResult> {
  try {
    // 1. Intentar verificar por CNAME
    try {
      const cnames = await dns.resolveCname(dominio);
      if (BASE_DOMAIN && cnames.some((c) => c.endsWith(BASE_DOMAIN))) {
        return { verificado: true, mensaje: 'CNAME verificado correctamente' };
      }
    } catch {
      // CNAME no existe, intentar con registro A
    }

    // 2. Intentar verificar por registro A
    try {
      const addresses = await dns.resolve4(dominio);
      if (SERVER_IP && addresses.includes(SERVER_IP)) {
        return { verificado: true, mensaje: 'Registro A verificado correctamente' };
      }
    } catch {
      // Registro A no existe o no resuelve
    }

    // 3. No se pudo verificar
    const instructions = [];
    if (SERVER_IP) {
      instructions.push(`Registro A apuntando a ${SERVER_IP}`);
    }
    if (BASE_DOMAIN) {
      instructions.push(`CNAME apuntando a ${BASE_DOMAIN}`);
    }

    return {
      verificado: false,
      mensaje: `El dominio ${dominio} no apunta a nuestro servidor. Configura: ${instructions.join(' o ')}`,
    };
  } catch (error) {
    logger.error({ err: error, dominio }, 'Error verificando DNS');
    return {
      verificado: false,
      mensaje: 'Error al verificar DNS. Intenta de nuevo más tarde.',
    };
  }
}

/**
 * Registra un nuevo dominio personalizado para una institución.
 * El dominio debe verificarse después (automática o manualmente).
 */
export async function registrarDominio(institucionId: string, dominio: string) {
  // Verificar que el plan incluye dominio propio
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { institucionId },
    include: { plan: { select: { features: true } } },
  });

  if (suscripcion) {
    const features = parsePlanFeatures(suscripcion.plan.features);
    if (!features.dominioPropio) {
      throw new ValidationError(
        'Tu plan actual no incluye dominio propio. Actualiza al plan Pro o Enterprise para usar un dominio personalizado.',
      );
    }
  }

  // Limpiar y normalizar el dominio
  const dominioLimpio = dominio
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

  // Validar que no sea un subdominio de la plataforma
  if (BASE_DOMAIN && dominioLimpio.endsWith(`.${BASE_DOMAIN}`)) {
    throw new ValidationError('No puedes registrar subdominios de la plataforma como dominio personalizado');
  }

  // Validar formato básico de dominio
  const dominioRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!dominioRegex.test(dominioLimpio)) {
    throw new ValidationError('Formato de dominio inválido');
  }

  // Verificar que no esté registrado por otra institución
  const existente = await prisma.institucionDominio.findUnique({
    where: { dominio: dominioLimpio },
  });

  if (existente) {
    if (existente.institucionId === institucionId) {
      throw new ConflictError('Este dominio ya está registrado para tu institución');
    }
    throw new ConflictError('Este dominio ya está registrado por otra institución');
  }

  // Crear el registro
  const registro = await prisma.institucionDominio.create({
    data: {
      institucionId,
      dominio: dominioLimpio,
      verificado: false,
      sslActivo: false,
    },
  });

  // Intentar verificar inmediatamente
  const verificacion = await verificarDominio(dominioLimpio);

  if (verificacion.verificado) {
    await prisma.institucionDominio.update({
      where: { id: registro.id },
      data: {
        verificado: true,
        verificadoAt: new Date(),
        sslActivo: true,
        ultimoCheck: new Date(),
      },
    });
  }

  // Preparar instrucciones de configuración
  const instrucciones = !verificacion.verificado
    ? {
        mensaje: 'Configura el DNS de tu dominio con una de estas opciones:',
        opcionA: SERVER_IP ? { tipo: 'A', nombre: '@', valor: SERVER_IP } : null,
        opcionCNAME: BASE_DOMAIN ? { tipo: 'CNAME', nombre: '@', valor: BASE_DOMAIN } : null,
        nota: 'Los cambios de DNS pueden tardar hasta 48 horas. Verificamos automáticamente cada hora.',
      }
    : null;

  return {
    dominio: { ...registro, verificado: verificacion.verificado },
    verificacion,
    instrucciones,
  };
}

/**
 * Fuerza la verificación de un dominio específico.
 */
export async function forzarVerificacion(dominioId: string, institucionId: string) {
  const registro = await prisma.institucionDominio.findFirst({
    where: { id: dominioId, institucionId },
  });

  if (!registro) {
    throw new NotFoundError('Dominio no encontrado');
  }

  const resultado = await verificarDominio(registro.dominio);

  await prisma.institucionDominio.update({
    where: { id: registro.id },
    data: {
      verificado: resultado.verificado,
      verificadoAt: resultado.verificado ? new Date() : undefined,
      sslActivo: resultado.verificado,
      ultimoCheck: new Date(),
    },
  });

  return {
    ...registro,
    verificado: resultado.verificado,
    verificacion: resultado,
  };
}

/**
 * Obtiene todos los dominios de una institución.
 */
export async function getDominiosByInstitucion(institucionId: string) {
  return prisma.institucionDominio.findMany({
    where: { institucionId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Elimina un dominio de una institución.
 */
export async function eliminarDominio(dominioId: string, institucionId: string) {
  const resultado = await prisma.institucionDominio.deleteMany({
    where: { id: dominioId, institucionId },
  });

  if (resultado.count === 0) {
    throw new NotFoundError('Dominio no encontrado o no pertenece a tu institución');
  }

  return { message: 'Dominio eliminado correctamente' };
}

/**
 * Job que verifica todos los dominios pendientes.
 * Debe ejecutarse periódicamente (ej: cada hora).
 */
export async function verificarDominiosPendientes(): Promise<{
  verificados: number;
  fallidos: number;
}> {
  const pendientes = await prisma.institucionDominio.findMany({
    where: { verificado: false },
  });

  let verificados = 0;
  let fallidos = 0;

  for (const registro of pendientes) {
    try {
      const resultado = await verificarDominio(registro.dominio);

      await prisma.institucionDominio.update({
        where: { id: registro.id },
        data: {
          verificado: resultado.verificado,
          verificadoAt: resultado.verificado ? new Date() : undefined,
          sslActivo: resultado.verificado,
          ultimoCheck: new Date(),
        },
      });

      if (resultado.verificado) {
        verificados++;
        logger.info({ dominio: registro.dominio }, 'Dominio verificado');
      } else {
        fallidos++;
      }
    } catch (error) {
      logger.error({ err: error, dominio: registro.dominio }, 'Error verificando dominio');
      fallidos++;
    }
  }

  return { verificados, fallidos };
}

/**
 * Verifica si un dominio está autorizado (para Caddy on_demand TLS).
 * Esta función es llamada por el endpoint interno /api/internal/verify-domain
 */
export async function isDomainAuthorized(domain: string): Promise<boolean> {
  // 1. Verificar si es un subdominio válido
  if (BASE_DOMAIN && domain.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = domain.replace(`.${BASE_DOMAIN}`, '');
    const institucion = await prisma.institucion.findUnique({
      where: { slug },
      select: { activo: true },
    });
    return institucion?.activo === true;
  }

  // 2. Verificar si es un dominio personalizado verificado
  const registro = await prisma.institucionDominio.findUnique({
    where: { dominio: domain, verificado: true },
    select: { id: true },
  });

  if (registro) {
    return true;
  }

  // 3. Verificar en campo legacy dominioPersonalizado
  const institucion = await prisma.institucion.findFirst({
    where: { dominioPersonalizado: domain, activo: true },
    select: { id: true },
  });

  return !!institucion;
}
