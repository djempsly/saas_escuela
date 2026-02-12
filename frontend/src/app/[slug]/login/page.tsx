'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { authApi, institucionesApi, getMediaUrl } from '@/lib/api';
import { Loader2, School, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { translations, Locale } from '@/lib/i18n/translations';
import { LanguageSelector } from '@/components/landing/LanguageSelector';

// Mapeo de idioma de BD a locale
const idiomaToLocale: Record<string, Locale> = {
  ESPANOL: 'es',
  FRANCES: 'fr',
  INGLES: 'en',
  KREYOL: 'ht',
};

// Idiomas disponibles por país
const IDIOMAS_POR_PAIS: Record<string, readonly Locale[]> = {
  DO: ['es', 'en'] as const,
  HT: ['ht', 'fr', 'en'] as const,
} as const;

interface InstitutionBranding {
  id: string;
  nombre: string;
  lema?: string;
  logoUrl?: string;
  logoPosicion?: string;
  fondoLoginUrl?: string;
  colorPrimario: string;
  colorSecundario: string;
  pais: string;
  idiomaPrincipal: string;
  slug: string;
}

export default function InstitutionLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const { login } = useAuthStore();
  const { setBranding } = useInstitutionStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);
  const [error, setError] = useState('');
  const [branding, setBrandingLocal] = useState<InstitutionBranding | null>(null);
  const [currentLocale, setCurrentLocale] = useState<Locale>('es');
  const [formData, setFormData] = useState({
    identificador: '',
    password: '',
  });

  // Cargar branding de la institución
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await institucionesApi.getBrandingBySlug(slug);
        const data = response.data;
        setBrandingLocal(data);

        // Establecer idioma inicial basado en la configuración de la institución
        const idioma = data.idiomaPrincipal || 'ESPANOL';
        const locale = idiomaToLocale[idioma] || 'es';
        setCurrentLocale(locale);
      } catch (err) {
        console.error('Error cargando branding:', err);
        setBrandingLocal(null);
      } finally {
        setIsLoadingBranding(false);
      }
    };

    if (slug) {
      loadBranding();
    }
  }, [slug]);

  const t = translations[currentLocale];

  // Obtener idiomas disponibles para esta institución
  const availableLanguages: Locale[] = branding?.pais
    ? [...(IDIOMAS_POR_PAIS[branding.pais] || ['es', 'en'] as Locale[])]
    : ['es', 'en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Enviar el slug para validar que el usuario pertenece a esta institución
      const response = await authApi.login(formData.identificador, formData.password, slug);
      const { token, user, debeCambiarPassword } = response.data;

      // Guardar usuario y token
      login({ ...user, debeCambiarPassword }, token);

      // Si el usuario tiene institución, cargar branding
      if (user.institucionId) {
        try {
          const brandingResponse = await institucionesApi.getBranding(user.institucionId);
          setBranding(brandingResponse.data);
        } catch (err) {
          console.error('Error cargando branding:', err);
        }
      }

      // Redirigir según estado y rol
      if (debeCambiarPassword) {
        router.push('/dashboard/cambiar-password');
      } else if (user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || (err instanceof Error ? err.message : t.auth.loginError));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoadingBranding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Institution not found
  if (!branding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{t.landing.notFound}</CardTitle>
            <CardDescription>{t.landing.notFoundDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.landing.backToHome}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estilos dinámicos basados en branding
  const fondoUrl = branding.fondoLoginUrl ? getMediaUrl(branding.fondoLoginUrl) : null;
  const backgroundStyle = fondoUrl
    ? {
        backgroundImage: `url(${fondoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `linear-gradient(135deg, ${branding.colorPrimario} 0%, ${branding.colorSecundario} 100%)`,
      };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={backgroundStyle}
    >
      {/* Overlay para mejor legibilidad si hay imagen de fondo */}
      {fondoUrl && (
        <div className="absolute inset-0 bg-black/50" />
      )}

      {/* Selector de idioma */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector
          currentLocale={currentLocale}
          onLocaleChange={setCurrentLocale}
          availableLocales={availableLanguages}
        />
      </div>

      {/* Botón para volver al landing */}
      <div className="absolute top-4 left-4 z-20">
        <Link href={`/${slug}`}>
          <Button variant="outline" size="sm" className="bg-white/90 hover:bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.landing.backToHome}
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {branding.logoUrl && getMediaUrl(branding.logoUrl) ? (
              <div className="relative w-20 h-20">
                <Image
                  src={getMediaUrl(branding.logoUrl)}
                  alt={branding.nombre}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: `${branding.colorPrimario}20` }}
              >
                <School
                  className="w-8 h-8"
                  style={{ color: branding.colorPrimario }}
                />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">{branding.nombre}</CardTitle>
          {branding.lema && (
            <p className="text-sm text-muted-foreground italic">{branding.lema}</p>
          )}
          <CardDescription className="mt-2">
            {t.auth.enterCredentials}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identificador">{t.auth.emailOrUsername}</Label>
              <Input
                id="identificador"
                type="text"
                placeholder={t.auth.emailOrUsernamePlaceholder}
                value={formData.identificador}
                onChange={(e) => setFormData({ ...formData, identificador: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              style={{
                backgroundColor: branding.colorPrimario,
                color: '#ffffff'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.auth.loggingIn}
                </>
              ) : (
                t.auth.enter
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="hover:underline"
                style={{ color: branding.colorPrimario }}
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
