'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { actividadesApi } from '@/lib/api';
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

// Componente de card de actividad con slider
function ActividadCard({ actividad, onOpenVideo }: { actividad: Actividad; onOpenVideo: (url: string) => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Obtener todas las fotos (compatibilidad con urlArchivo legacy)
  const fotos = actividad.fotos?.length
    ? actividad.fotos
    : actividad.urlArchivo
      ? [actividad.urlArchivo]
      : [];

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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {fotos.length > 0 && (
        <div className="aspect-video relative bg-slate-100 group">
          <Image
            src={fotos[currentSlide]}
            alt={actividad.titulo}
            fill
            className="object-cover"
            unoptimized
          />

          {/* Navegación del slider */}
          {fotos.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Indicadores */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {fotos.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(index);
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>

              {/* Contador de imágenes */}
              <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {currentSlide + 1}/{fotos.length}
              </div>
            </>
          )}

          {/* Botón de video */}
          {hasVideo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVideo(actividad.videos![0]);
              }}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
            >
              <Play className="w-3 h-3" />
              Ver Video
            </button>
          )}
        </div>
      )}

      {/* Si no hay fotos pero hay video */}
      {fotos.length === 0 && hasVideo && (
        <div className="aspect-video relative bg-slate-900 flex items-center justify-center">
          <button
            onClick={() => onOpenVideo(actividad.videos![0])}
            className="flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              <Play className="w-8 h-8 ml-1" />
            </div>
            <span className="text-sm">Ver Video</span>
          </button>
        </div>
      )}

      <CardHeader>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Calendar className="w-3 h-3" />
          {formatDate(actividad.createdAt)}
        </div>
        <CardTitle className="text-lg line-clamp-2">
          {actividad.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {actividad.contenido}
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Por: {actividad.autor.nombre} {actividad.autor.apellido}
        </p>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<string | null>(null);

  useEffect(() => {
    const fetchActividades = async () => {
      try {
        // Solo cargar actividades globales (sin institucionId)
        const response = await actividadesApi.getAll(6);
        setActividades(response.data || []);
      } catch (error) {
        console.error('Error cargando actividades:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActividades();
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
