'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhotoSlider } from '@/components/landing/PhotoSlider';
import { MediaViewer } from '@/components/landing/MediaViewer';
import { LanguageSelector } from '@/components/landing/LanguageSelector';
import { institucionesApi, actividadesApi } from '@/lib/api';
import { translations, type Locale } from '@/lib/i18n/translations';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  ArrowRight,
  Loader2,
  Building2,
  Image as ImageIcon,
  Video,
  Play,
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

export default function InstitucionLandingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branding, setBranding] = useState<Branding | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('es');

  // Media viewer state
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [currentMedia, setCurrentMedia] = useState<{
    type: 'photo' | 'video';
    url: string;
    title?: string;
    description?: string;
  } | null>(null);
  const [allMedia, setAllMedia] = useState<Array<{ type: 'photo' | 'video'; url: string }>>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

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
        // Obtener branding por slug
        const brandingResponse = await institucionesApi.getBrandingBySlug(slug);
        const brandingData = brandingResponse.data;
        setBranding(brandingData);

        // Set initial locale based on institution's idiomaPrincipal
        if (brandingData.idiomaPrincipal) {
          const mappedLocale = IDIOMA_TO_LOCALE[brandingData.idiomaPrincipal];
          if (mappedLocale) {
            setLocale(mappedLocale);
          }
        }

        // Obtener actividades de la institucion
        const actividadesResponse = await actividadesApi.getBySlug(slug, 10);
        const actividadesData = actividadesResponse.data || [];

        // Process actividades to extract media
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

  // Collect all photos and videos from activities
  const allPhotos = useMemo(() => {
    const photos: { url: string; actividad: Actividad }[] = [];
    actividades.forEach((act) => {
      // Add urlArchivo if exists
      if (act.urlArchivo) {
        photos.push({ url: act.urlArchivo, actividad: act });
      }
      // Add fotos array
      if (act.fotos && act.fotos.length > 0) {
        act.fotos.forEach((url) => {
          photos.push({ url, actividad: act });
        });
      }
    });
    return photos;
  }, [actividades]);

  const allVideos = useMemo(() => {
    const videos: { url: string; actividad: Actividad }[] = [];
    actividades.forEach((act) => {
      if (act.videos && act.videos.length > 0) {
        act.videos.forEach((url) => {
          videos.push({ url, actividad: act });
        });
      }
    });
    return videos;
  }, [actividades]);

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

  const openPhotoViewer = (photoIndex: number) => {
    if (allPhotos.length === 0) return;
    const photo = allPhotos[photoIndex];
    const mediaList = allPhotos.map((p) => ({ type: 'photo' as const, url: p.url }));
    setAllMedia(mediaList);
    setCurrentMediaIndex(photoIndex);
    setCurrentMedia({
      type: 'photo',
      url: photo.url,
      title: photo.actividad.titulo,
      description: photo.actividad.contenido,
    });
    setMediaViewerOpen(true);
  };

  const openVideoViewer = (videoIndex: number) => {
    if (allVideos.length === 0) return;
    const video = allVideos[videoIndex];
    const mediaList = allVideos.map((v) => ({ type: 'video' as const, url: v.url }));
    setAllMedia(mediaList);
    setCurrentMediaIndex(videoIndex);
    setCurrentMedia({
      type: 'video',
      url: video.url,
      title: video.actividad.titulo,
      description: video.actividad.contenido,
    });
    setMediaViewerOpen(true);
  };

  const handleMediaNavigate = (index: number) => {
    if (index < 0 || index >= allMedia.length) return;
    const media = allMedia[index];

    if (media.type === 'photo') {
      const photo = allPhotos[index];
      setCurrentMedia({
        type: 'photo',
        url: photo.url,
        title: photo.actividad.titulo,
        description: photo.actividad.contenido,
      });
    } else {
      const video = allVideos[index];
      setCurrentMedia({
        type: 'video',
        url: video.url,
        title: video.actividad.titulo,
        description: video.actividad.contenido,
      });
    }
    setCurrentMediaIndex(index);
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

  // Logo position classes
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
                src={branding.logoUrl}
                alt={branding.nombre}
                width={40}
                height={40}
                className="rounded"
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
            {/* Language Selector */}
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

      {/* Hero Section with Logo Position */}
      <section className="pt-32 pb-20 px-4" style={{ backgroundColor: `${primaryColor}10` }}>
        <div className={`container mx-auto max-w-4xl flex flex-col ${logoPositionClasses[logoPosicion]}`}>
          {branding.logoUrl && (
            <div className="mb-6">
              <Image
                src={branding.logoUrl}
                alt={branding.nombre}
                width={120}
                height={120}
                className="rounded-lg shadow-lg"
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

      {/* Photo Slider Section */}
      {allPhotos.length > 0 && (
        <section className="py-12 px-4 bg-slate-100">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: primaryColor }}>
                <ImageIcon className="w-6 h-6" />
                {t.landing.photos}
              </h2>
              {allPhotos.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPhotoViewer(0)}
                >
                  {t.landing.viewGallery} ({allPhotos.length})
                </Button>
              )}
            </div>
            <PhotoSlider
              photos={allPhotos.map((p) => p.url)}
              onPhotoClick={openPhotoViewer}
              className="shadow-xl"
            />
          </div>
        </section>
      )}

      {/* Videos Section */}
      {allVideos.length > 0 && (
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: primaryColor }}>
                <Video className="w-6 h-6" />
                {t.landing.videos}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allVideos.slice(0, 6).map((video, idx) => (
                <Card
                  key={idx}
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => openVideoViewer(idx)}
                >
                  <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium line-clamp-1">
                      {video.actividad.titulo}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Actividades Section */}
      {actividades.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: primaryColor }}>
                {t.landing.newsAndActivities}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t.landing.stayUpdated}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {actividades.map((actividad) => (
                <Card
                  key={actividad.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {actividad.urlArchivo && (
                    <div className="aspect-video relative bg-slate-100">
                      <Image
                        src={actividad.urlArchivo}
                        alt={actividad.titulo}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      {formatDate(actividad.createdAt)}
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{actividad.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {actividad.contenido}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      {t.landing.by}: {actividad.autor.nombre} {actividad.autor.apellido}
                    </p>
                  </CardContent>
                </Card>
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
                src={branding.logoUrl}
                alt={branding.nombre}
                width={24}
                height={24}
                className="rounded"
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

      {/* Media Viewer */}
      {currentMedia && branding && (
        <MediaViewer
          isOpen={mediaViewerOpen}
          onClose={() => {
            setMediaViewerOpen(false);
            setCurrentMedia(null);
          }}
          media={currentMedia}
          branding={{
            logoUrl: branding.logoUrl,
            nombre: branding.nombre,
            colorPrimario: primaryColor,
          }}
          translations={{
            close: t.landing.close,
            previous: t.landing.previous,
            next: t.landing.next,
          }}
          allMedia={allMedia}
          currentIndex={currentMediaIndex}
          onNavigate={handleMediaNavigate}
        />
      )}
    </div>
  );
}
