import { NextRequest, NextResponse } from 'next/server';

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || '';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Cache en memoria: dominio → { slug, expiresAt }
const domainCache = new Map<string, { slug: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Subdominios reservados que no son instituciones
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'smtp', 'imap'];

/**
 * Resuelve el slug de una institución a partir de un dominio personalizado.
 * Usa cache en memoria para evitar llamadas repetidas al backend.
 */
async function resolveSlugFromDomain(dominio: string): Promise<string | null> {
  // Revisar cache
  const cached = domainCache.get(dominio);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/instituciones/dominio/${dominio}/branding`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.slug) {
      domainCache.set(dominio, { slug: data.slug, expiresAt: Date.now() + CACHE_TTL });
      return data.slug;
    }

    return null;
  } catch (error) {
    console.error(`[MIDDLEWARE] Error resolviendo dominio ${dominio}:`, error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Si no hay BASE_DOMAIN, el middleware no hace nada (modo desarrollo)
  if (!BASE_DOMAIN) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('host')?.split(':')[0] || '';
  const { pathname } = request.nextUrl;

  // Skip: archivos estáticos, _next, favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  let slug: string | null = null;

  // 1. Resolución por subdominio (ej: miescuela.lhams.com)
  if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${BASE_DOMAIN}`, '');

    // Ignorar subdominios reservados
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return NextResponse.next();
    }

    slug = subdomain;
  }
  // 2. Si es el dominio base exacto, no hacer nada
  else if (hostname === BASE_DOMAIN) {
    return NextResponse.next();
  }
  // 3. Dominio personalizado (ej: miescuela.com)
  else {
    slug = await resolveSlugFromDomain(hostname);

    if (!slug) {
      // No se pudo resolver el dominio, dejar pasar (mostrará 404 natural)
      return NextResponse.next();
    }
  }

  // Si tenemos slug, hacer rewrite
  if (slug) {
    // Si el path ya empieza con /slug, no hacer doble prefijo
    if (pathname.startsWith(`/${slug}/`) || pathname === `/${slug}`) {
      return NextResponse.next();
    }

    // Rewrite interno: prepend el slug al path
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (e.g. .js, .css, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
