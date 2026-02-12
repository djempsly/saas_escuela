import prisma from '../../config/db';

// Obtener configuración de branding (pública para login)
export const getInstitucionBranding = async (id: string) => {
  return prisma.institucion.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      logoPosicion: true,
      logoWidth: true,
      logoHeight: true,
      fondoLoginUrl: true,
      loginLogoUrl: true,
      loginBgType: true,
      loginBgColor: true,
      loginBgGradient: true,
      faviconUrl: true,
      heroImageUrl: true,
      heroTitle: true,
      heroSubtitle: true,
      colorPrimario: true,
      colorSecundario: true,
      pais: true,
      sistema: true,
      idiomaPrincipal: true,
      slug: true,
      autogestionActividades: true,
      direccion: true,
      codigoCentro: true,
      distritoEducativo: true,
      regionalEducacion: true,
      sabanaColores: true,
    },
  });
};

// Obtener branding por slug (público)
export const getInstitucionBrandingBySlug = async (slug: string) => {
  return prisma.institucion.findUnique({
    where: { slug },
    select: {
      id: true,
      nombre: true,
      lema: true,
      logoUrl: true,
      logoPosicion: true,
      logoWidth: true,
      logoHeight: true,
      fondoLoginUrl: true,
      loginLogoUrl: true,
      loginBgType: true,
      loginBgColor: true,
      loginBgGradient: true,
      faviconUrl: true,
      heroImageUrl: true,
      heroTitle: true,
      heroSubtitle: true,
      colorPrimario: true,
      colorSecundario: true,
      pais: true,
      sistema: true,
      idiomaPrincipal: true,
      slug: true,
      autogestionActividades: true,
    },
  });
};

// Obtener branding por dominio (público)
// Busca primero en InstitucionDominio (verificado), luego fallback a dominioPersonalizado (legacy)
export const getInstitucionBrandingByDominio = async (dominio: string) => {
  const brandingSelect = {
    id: true,
    nombre: true,
    lema: true,
    logoUrl: true,
    logoPosicion: true,
    logoWidth: true,
    logoHeight: true,
    fondoLoginUrl: true,
    loginLogoUrl: true,
    loginBgType: true,
    loginBgColor: true,
    loginBgGradient: true,
    faviconUrl: true,
    heroImageUrl: true,
    heroTitle: true,
    heroSubtitle: true,
    colorPrimario: true,
    colorSecundario: true,
    pais: true,
    sistema: true,
    idiomaPrincipal: true,
    slug: true,
    autogestionActividades: true,
  };

  // 1. Buscar en tabla InstitucionDominio (dominios verificados)
  const dominioRegistro = await prisma.institucionDominio.findUnique({
    where: { dominio, verificado: true },
    include: {
      institucion: {
        select: brandingSelect,
      },
    },
  });

  if (dominioRegistro && dominioRegistro.institucion) {
    return dominioRegistro.institucion;
  }

  // 2. Fallback: buscar por dominioPersonalizado directo (campo legacy)
  return prisma.institucion.findFirst({
    where: { dominioPersonalizado: dominio, activo: true },
    select: brandingSelect,
  });
};
