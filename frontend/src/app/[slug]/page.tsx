'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { institucionesApi, actividadesApi } from '@/lib/api';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  ArrowRight,
  Loader2,
  Building2,
} from 'lucide-react';

interface Branding {
  id: string;
  nombre: string;
  lema: string | null;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  slug: string;
  autogestionActividades: boolean;
}

interface Actividad {
  id: string;
  titulo: string;
  contenido: string;
  urlArchivo: string | null;
  createdAt: string;
  autor: {
    nombre: string;
    apellido: string;
  };
}

export default function InstitucionLandingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branding, setBranding] = useState<Branding | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener branding por slug
        const brandingResponse = await institucionesApi.getBrandingBySlug(slug);
        setBranding(brandingResponse.data);

        // Obtener actividades de la institucion
        const actividadesResponse = await actividadesApi.getBySlug(slug, 6);
        setActividades(actividadesResponse.data || []);
      } catch (err: any) {
        console.error('Error loading institution:', err);
        if (err.response?.status === 404) {
          setError('Institucion no encontrada');
        } else {
          setError('Error al cargar la institucion');
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
    return new Date(dateString).toLocaleDateString('es-ES', {
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
          {error || 'Institucion no encontrada'}
        </h1>
        <p className="text-muted-foreground mb-4">
          La institucion que buscas no existe o no esta disponible.
        </p>
        <Link href="/">
          <Button>Volver al inicio</Button>
        </Link>
      </div>
    );
  }

  const primaryColor = branding.colorPrimario || '#1a365d';
  const secondaryColor = branding.colorSecundario || '#3182ce';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header
        className="fixed top-0 w-full backdrop-blur-sm border-b z-50"
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
          <Link href={`/login?institucion=${branding.id}`}>
            <Button
              variant="secondary"
              style={{ backgroundColor: secondaryColor, color: 'white' }}
            >
              Iniciar Sesion
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4" style={{ backgroundColor: `${primaryColor}10` }}>
        <div className="container mx-auto text-center max-w-4xl">
          {branding.logoUrl && (
            <div className="mb-6">
              <Image
                src={branding.logoUrl}
                alt={branding.nombre}
                width={120}
                height={120}
                className="mx-auto rounded-lg shadow-lg"
              />
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: primaryColor }}>
            {branding.nombre}
          </h1>
          {branding.lema && (
            <p className="text-xl text-muted-foreground mb-8 italic">&ldquo;{branding.lema}&rdquo;</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/login?institucion=${branding.id}`}>
              <Button
                size="lg"
                className="w-full sm:w-auto"
                style={{ backgroundColor: primaryColor }}
              >
                Acceder al Portal
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Actividades Section */}
      {actividades.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4" style={{ color: primaryColor }}>
                Noticias y Actividades
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Mantente al dia con las ultimas novedades de nuestra institucion
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
                      Por: {actividad.autor.nombre} {actividad.autor.apellido}
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Proximamente</h2>
            <p className="text-muted-foreground">
              Pronto publicaremos noticias y actividades de nuestra institucion.
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-4 text-white" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">Forma parte de nuestra comunidad</h2>
          <p className="text-white/80 mb-8">
            Accede al portal educativo para gestionar tu informacion academica
          </p>
          <Link href={`/login?institucion=${branding.id}`}>
            <Button
              size="lg"
              variant="secondary"
              style={{ backgroundColor: secondaryColor, color: 'white' }}
            >
              Iniciar Sesion
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
            &copy; {new Date().getFullYear()} {branding.nombre}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
