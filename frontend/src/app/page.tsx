'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { publicEndpoints, getMediaUrl } from '@/lib/api';
import {
  GraduationCap,
  Users,
  BookOpen,
  BarChart3,
  ArrowRight,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface Actividad {
  id: string;
  titulo: string;
  contenido: string;
  urlArchivo?: string;
  fotos?: string[];
  videos?: string[];
  tipoMedia?: string;
  createdAt: string;
  autor: {
    nombre: string;
    apellido: string;
  };
}

interface Institucion {
  id: string;
  nombre: string;
  slug: string;
  logoUrl?: string;
}

// Componente de card de actividad con slider grande y título prominente
function ActividadCard({ actividad, onOpenVideo }: { actividad: Actividad; onOpenVideo: (url: string) => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Obtener todas las fotos (compatibilidad con urlArchivo legacy) y convertir a URLs absolutas
  const fotos = (actividad.fotos?.length
    ? actividad.fotos
    : actividad.urlArchivo
      ? [actividad.urlArchivo]
      : []).map(url => getMediaUrl(url));

  const hasVideo = actividad.videos && actividad.videos.length > 0;

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % fotos.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + fotos.length) % fotos.length);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="group rounded-xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300">
      {/* Título prominente encima */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
        <h3 className="text-white font-bold text-lg md:text-xl line-clamp-2">
          {actividad.titulo}
        </h3>
        <div className="flex items-center gap-2 text-white/80 text-xs mt-1">
          <Calendar className="w-3 h-3" />
          {formatDate(actividad.createdAt)}
        </div>
      </div>

      {/* Slider de imágenes - más grande y centrado */}
      {fotos.length > 0 && (
        <div className="relative bg-slate-900" style={{ aspectRatio: '16/10' }}>
          <Image
            src={fotos[currentSlide]}
            alt={actividad.titulo}
            fill
            className="object-contain"
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Navegación del slider */}
          {fotos.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Indicadores más visibles */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 px-3 py-1.5 rounded-full">
                {fotos.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(index);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                      index === currentSlide
                        ? 'bg-white scale-110'
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              {/* Contador de imágenes */}
              <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                {currentSlide + 1} / {fotos.length}
              </div>
            </>
          )}

          {/* Botón de video */}
          {hasVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVideo(getMediaUrl(actividad.videos![0]));
              }}
              className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors shadow-lg"
            >
              <Play className="w-4 h-4" />
              Ver Video
            </button>
          )}
        </div>
      )}

      {/* Si no hay fotos pero hay video */}
      {fotos.length === 0 && hasVideo && (
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center" style={{ aspectRatio: '16/10' }}>
          <button
            onClick={() => onOpenVideo(getMediaUrl(actividad.videos![0]))}
            className="flex flex-col items-center gap-3 text-white hover:scale-105 transition-transform"
          >
            <div className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-xl transition-colors">
              <Play className="w-10 h-10 ml-1" />
            </div>
            <span className="font-medium">Ver Video</span>
          </button>
        </div>
      )}

      {/* Descripción */}
      <div className="p-4">
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
          {actividad.contenido}
        </p>
        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
          Por: <span className="font-medium text-slate-500">{actividad.autor.nombre} {actividad.autor.apellido}</span>
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar actividades e instituciones en paralelo usando endpoints públicos
        const [actividadesRes, institucionesRes] = await Promise.all([
          publicEndpoints.getActividades(5),
          publicEndpoints.getInstituciones(),
        ]);
        setActividades(actividadesRes.data || []);
        const instData = institucionesRes.data?.data || institucionesRes.data || [];
        // Las instituciones ya vienen filtradas con logo desde el backend
        setInstituciones(instData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para detectar tipo de video
  const getVideoEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    // URL directa de video
    return url;
  };

  const isDirectVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i) || url.startsWith('/uploads/');
  };

  const features = [
    {
      icon: GraduationCap,
      title: 'Gestión de Clases',
      description: 'Administra clases, horarios y asignaciones de docentes de manera eficiente.',
    },
    {
      icon: Users,
      title: 'Control de Estudiantes',
      description: 'Inscripciones, asistencia y seguimiento académico en un solo lugar.',
    },
    {
      icon: BookOpen,
      title: 'Calificaciones',
      description: 'Sistema de calificaciones adaptado a diferentes sistemas educativos.',
    },
    {
      icon: BarChart3,
      title: 'Reportes y Analíticas',
      description: 'Visualiza el rendimiento académico con reportes detallados.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Modal de Video */}
      {videoModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setVideoModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            {isDirectVideo(videoModal) ? (
              <video
                src={videoModal}
                className="w-full h-full"
                controls
                autoPlay
              />
            ) : (
              <iframe
                src={getVideoEmbedUrl(videoModal)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <span className="font-bold text-xl">EduPlatform</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-primary">
              Características
            </a>
            <a href="#actividades" className="text-sm text-muted-foreground hover:text-primary">
              Actividades
            </a>
            <Link href="/login">
              <Button>Iniciar Sesión</Button>
            </Link>
          </nav>
          <Link href="/login" className="md:hidden">
            <Button size="sm">Ingresar</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Plataforma Educativa
            <span className="text-primary"> Multitenant</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Solución integral para la gestión de instituciones educativas.
            Administra estudiantes, docentes, calificaciones y más desde un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Comenzar Ahora
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Conocer Más
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Todo lo que necesitas
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Herramientas diseñadas para facilitar la gestión educativa
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-0 shadow-sm">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Actividades Section */}
      <section id="actividades" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Actividades Recientes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Mantente al día con las últimas noticias y eventos
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : actividades.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {actividades.map((actividad) => (
                <ActividadCard
                  key={actividad.id}
                  actividad={actividad}
                  onOpenVideo={setVideoModal}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay actividades publicadas aún
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Instituciones Section */}
      {instituciones.length > 0 && (
        <section className="py-16 px-4 bg-slate-50">
          <div className="container mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Instituciones que confían en nosotros
              </h2>
              <p className="text-muted-foreground">
                Conoce las instituciones que forman parte de nuestra plataforma
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
              {instituciones.map((institucion) => (
                <Link
                  key={institucion.id}
                  href={`/${institucion.slug}`}
                  className="group flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200"
                >
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white shadow-sm border border-slate-200 group-hover:shadow-lg transition-shadow">
                    <Image
                      src={getMediaUrl(institucion.logoUrl)}
                      alt={institucion.nombre}
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                  <span className="text-sm text-slate-600 font-medium text-center max-w-[120px] line-clamp-2 group-hover:text-primary transition-colors">
                    {institucion.nombre}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-white">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para transformar tu institución?
          </h2>
          <p className="text-white/80 mb-8">
            Únete a las instituciones que ya confían en nuestra plataforma
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Comenzar Ahora
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-semibold">EduPlatform</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EduPlatform. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
