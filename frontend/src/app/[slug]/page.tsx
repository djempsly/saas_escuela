'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/landing/LanguageSelector';
import { institucionesApi, actividadesApi, getMediaUrl } from '@/lib/api';
import { translations, type Locale } from '@/lib/i18n/translations';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  ArrowRight,
  Loader2,
  Building2,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  Image as ImageIcon,
  Video,
} from 'lucide-react';

interface Branding {
  id: string;
  nombre: string;
  lema: string | null;
  logoUrl: string | null;
  logoPosicion?: string;
  colorPrimario: string;
  colorSecundario: string;
  slug: string;
  pais?: string;
  idiomaPrincipal?: string;
  autogestionActividades: boolean;
}

interface Actividad {
  id: string;
  titulo: string;
  contenido: string;
  urlArchivo: string | null;
  fotos?: string[];
  videos?: string[];
  tipoMedia?: string;
  createdAt: string;
  autor: {
    nombre: string;
    apellido: string;
  };
}

// Map idiomaPrincipal enum to locale
const IDIOMA_TO_LOCALE: Record<string, Locale> = {
  ESPANOL: 'es',
  INGLES: 'en',
  FRANCES: 'fr',
  KREYOL: 'ht',
};

// Available locales by country
const LOCALES_BY_COUNTRY: Record<string, Locale[]> = {
  DO: ['es', 'en'],
  HT: ['ht', 'fr', 'en'],
};

// Helper para detectar si es YouTube
const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return match ? match[1] : null;
};

// Componente de Card de Actividad con su propio slider
function ActividadCard({
  actividad,
  onClick,
  primaryColor,
  formatDate,
}: {
  actividad: Actividad;
  onClick: () => void;
  primaryColor: string;
  formatDate: (date: string) => string;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Obtener fotos de la actividad
  const fotos = useMemo(() => {
    const urls: string[] = [];
    if (actividad.fotos && actividad.fotos.length > 0) {
      urls.push(...actividad.fotos.map(url => getMediaUrl(url)));
    } else if (actividad.urlArchivo) {
      urls.push(getMediaUrl(actividad.urlArchivo));
    }
    return urls;
  }, [actividad]);

  const hasVideo = actividad.videos && actividad.videos.length > 0;

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % fotos.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + fotos.length) % fotos.length);
  };

  return (
    <div
      className="group rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      {/* Slider de imagenes de esta actividad */}
      {fotos.length > 0 && (
        <div className="relative bg-slate-900" style={{ aspectRatio: '16/10' }}>
          <Image
            src={fotos[currentSlide]}
            alt={actividad.titulo}
            fill
            className="object-contain"
            unoptimized
          />

          {/* Navegacion del slider */}
          {fotos.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Indicadores */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 px-3 py-1.5 rounded-full">
                {fotos.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>

              {/* Contador */}
              <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {currentSlide + 1}/{fotos.length}
              </div>
            </>
          )}

          {/* Badge de video */}
          {hasVideo && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Play className="w-3 h-3" />
              Video
            </div>
          )}
        </div>
      )}

      {/* Si no hay fotos pero hay video */}
      {fotos.length === 0 && hasVideo && (
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center" style={{ aspectRatio: '16/10' }}>
          <div className="flex flex-col items-center gap-2 text-white">
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <Play className="w-8 h-8 ml-1" />
            </div>
            <span className="text-sm">Ver Video</span>
          </div>
        </div>
      )}

      {/* Informacion de la actividad */}
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Calendar className="w-3 h-3" />
          {formatDate(actividad.createdAt)}
        </div>
        <h3 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: primaryColor }}>
          {actividad.titulo}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2 whitespace-pre-line">
          {actividad.contenido}
        </p>
        <p className="text-xs text-slate-400 mt-3">
          Por: {actividad.autor.nombre} {actividad.autor.apellido}
        </p>
      </div>
    </div>
  );
}

// Modal de Actividad en pantalla completa
function ActividadModal({
  actividad,
  isOpen,
  onClose,
  primaryColor,
  formatDate,
}: {
  actividad: Actividad | null;
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
  formatDate: (date: string) => string;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideo, setShowVideo] = useState(false);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setShowVideo(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide]);

  if (!isOpen || !actividad) return null;

  // Obtener fotos
  const fotos = actividad.fotos?.length
    ? actividad.fotos.map(url => getMediaUrl(url))
    : actividad.urlArchivo
      ? [getMediaUrl(actividad.urlArchivo)]
      : [];

  // Obtener videos
  const videos = actividad.videos?.map(url => getMediaUrl(url)) || [];
  const hasVideo = videos.length > 0;

  const nextSlide = () => {
    if (fotos.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % fotos.length);
    }
  };

  const prevSlide = () => {
    if (fotos.length > 1) {
      setCurrentSlide((prev) => (prev - 1 + fotos.length) % fotos.length);
    }
  };

  // Renderizar video (YouTube o directo)
  const renderVideo = (url: string) => {
    const youtubeId = getYouTubeId(url);
    if (youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return (
      <video
        src={url}
        className="w-full h-full"
        controls
        autoPlay
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Boton cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Seccion superior: Slider/Video */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="relative w-full max-w-5xl h-full max-h-[60vh]">
          {showVideo && hasVideo ? (
            // Mostrar video
            <div className="w-full h-full bg-black rounded-lg overflow-hidden">
              {renderVideo(videos[0])}
            </div>
          ) : fotos.length > 0 ? (
            // Mostrar slider de fotos
            <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
              <Image
                src={fotos[currentSlide]}
                alt={actividad.titulo}
                fill
                className="object-contain"
                unoptimized
              />

              {/* Navegacion */}
              {fotos.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-3 rounded-full shadow-lg transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-3 rounded-full shadow-lg transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  {/* Indicadores */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 px-4 py-2 rounded-full">
                    {fotos.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentSlide ? 'bg-white scale-110' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Contador */}
                  <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {currentSlide + 1} / {fotos.length}
                  </div>
                </>
              )}

              {/* Boton ver video */}
              {hasVideo && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Ver Video
                </button>
              )}
            </div>
          ) : hasVideo ? (
            // Solo video, sin fotos
            <div className="w-full h-full bg-black rounded-lg overflow-hidden">
              {renderVideo(videos[0])}
            </div>
          ) : null}
        </div>
      </div>

      {/* Seccion inferior: Titulo y descripcion */}
      <div className="bg-white/10 backdrop-blur-sm border-t border-white/20">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-3 text-white/60 text-sm mb-3">
            <Calendar className="w-4 h-4" />
            {formatDate(actividad.createdAt)}
            <span className="mx-2">|</span>
            Por: {actividad.autor.nombre} {actividad.autor.apellido}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {actividad.titulo}
          </h2>
          <p className="text-white/80 text-base md:text-lg leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line">
            {actividad.contenido}
          </p>

          {/* Botones de navegacion entre fotos y video */}
          {hasVideo && fotos.length > 0 && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-white/20">
              <button
                onClick={() => setShowVideo(false)}
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                  !showVideo ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Fotos ({fotos.length})
              </button>
              <button
                onClick={() => setShowVideo(true)}
                className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-colors ${
                  showVideo ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InstitucionLandingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branding, setBranding] = useState<Branding | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('es');

  // Modal state
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);

  // Get translations
  const t = useMemo(() => translations[locale], [locale]);

  // Get available locales based on country
  const availableLocales = useMemo(() => {
    if (!branding?.pais) return ['es', 'en'] as Locale[];
    return LOCALES_BY_COUNTRY[branding.pais] || ['es', 'en'];
  }, [branding?.pais]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const brandingResponse = await institucionesApi.getBrandingBySlug(slug);
        const brandingData = brandingResponse.data;
        setBranding(brandingData);

        if (brandingData.idiomaPrincipal) {
          const mappedLocale = IDIOMA_TO_LOCALE[brandingData.idiomaPrincipal];
          if (mappedLocale) {
            setLocale(mappedLocale);
          }
        }

        const actividadesResponse = await actividadesApi.getBySlug(slug, 10);
        const actividadesData = actividadesResponse.data || [];

        const processedActividades = actividadesData.map((act: any) => ({
          ...act,
          fotos: Array.isArray(act.fotos) ? act.fotos : (act.fotos ? JSON.parse(act.fotos) : []),
          videos: Array.isArray(act.videos) ? act.videos : (act.videos ? JSON.parse(act.videos) : []),
        }));

        setActividades(processedActividades);
      } catch (err: any) {
        console.error('Error loading institution:', err);
        if (err.response?.status === 404) {
          setError('notFound');
        } else {
          setError('error');
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug]);

  const formatDate = (dateString: string) => {
    const localeMap: Record<Locale, string> = {
      es: 'es-ES',
      fr: 'fr-FR',
      en: 'en-US',
      ht: 'fr-HT',
    };
    return new Date(dateString).toLocaleDateString(localeMap[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !branding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t.landing.notFound}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t.landing.notFoundDesc}
        </p>
        <Link href="/">
          <Button>{t.landing.backToHome}</Button>
        </Link>
      </div>
    );
  }

  const primaryColor = branding.colorPrimario || '#1a365d';
  const secondaryColor = branding.colorSecundario || '#3182ce';
  const logoPosicion = branding.logoPosicion || 'center';

  const logoPositionClasses: Record<string, string> = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header
        className="fixed top-0 w-full backdrop-blur-sm border-b z-40"
        style={{ backgroundColor: `${primaryColor}ee` }}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <Image
                src={getMediaUrl(branding.logoUrl)}
                alt={branding.nombre}
                width={40}
                height={40}
                className="rounded"
                unoptimized
              />
            ) : (
              <div
                className="w-10 h-10 rounded flex items-center justify-center"
                style={{ backgroundColor: secondaryColor }}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
            )}
            <span className="font-bold text-xl text-white">{branding.nombre}</span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector
              currentLocale={locale}
              availableLocales={availableLocales}
              onLocaleChange={setLocale}
            />

            <Link href={`/${slug}/login`}>
              <Button
                variant="secondary"
                style={{ backgroundColor: secondaryColor, color: 'white' }}
              >
                {t.landing.login}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4" style={{ backgroundColor: `${primaryColor}10` }}>
        <div className={`container mx-auto max-w-4xl flex flex-col ${logoPositionClasses[logoPosicion]}`}>
          {branding.logoUrl && (
            <div className="mb-6">
              <Image
                src={getMediaUrl(branding.logoUrl)}
                alt={branding.nombre}
                width={120}
                height={120}
                className="rounded-lg shadow-lg"
                unoptimized
              />
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: primaryColor }}>
            {branding.nombre}
          </h1>
          {branding.lema && (
            <p className="text-xl text-muted-foreground mb-8 italic">&ldquo;{branding.lema}&rdquo;</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/${slug}/login`}>
              <Button
                size="lg"
                className="w-full sm:w-auto"
                style={{ backgroundColor: primaryColor }}
              >
                {t.landing.accessPortal}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Actividades Section */}
      {actividades.length > 0 && (
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: primaryColor }}>
                {t.landing.newsAndActivities}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t.landing.stayUpdated}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {actividades.map((actividad) => (
                <ActividadCard
                  key={actividad.id}
                  actividad={actividad}
                  onClick={() => setSelectedActividad(actividad)}
                  primaryColor={primaryColor}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sin Actividades */}
      {actividades.length === 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.landing.comingSoon}</h2>
            <p className="text-muted-foreground">
              {t.landing.comingSoonDesc}
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 text-white" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">{t.landing.joinCommunity}</h2>
          <p className="text-white/80 mb-8">
            {t.landing.accessEducationalPortal}
          </p>
          <Link href={`/${slug}/login`}>
            <Button
              size="lg"
              variant="secondary"
              style={{ backgroundColor: secondaryColor, color: 'white' }}
            >
              {t.landing.login}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              <Image
                src={getMediaUrl(branding.logoUrl)}
                alt={branding.nombre}
                width={24}
                height={24}
                className="rounded"
                unoptimized
              />
            ) : (
              <GraduationCap className="w-6 h-6" style={{ color: primaryColor }} />
            )}
            <span className="font-semibold">{branding.nombre}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {branding.nombre}. {t.landing.allRightsReserved}
          </p>
        </div>
      </footer>

      {/* Modal de Actividad */}
      <ActividadModal
        actividad={selectedActividad}
        isOpen={!!selectedActividad}
        onClose={() => setSelectedActividad(null)}
        primaryColor={primaryColor}
        formatDate={formatDate}
      />
    </div>
  );
}
