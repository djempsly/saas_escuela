'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { institucionesApi, adminApi, getMediaUrl } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Edit,
  Users,
  Calendar,
  Globe,
  Mail,
  User,
  BookOpen,
  History,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Director {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
}

interface HistorialDirector {
  id: string;
  fechaInicio: string;
  fechaFin?: string;
  motivo?: string;
  director: Director;
}

interface Institucion {
  id: string;
  nombre: string;
  lema?: string;
  slug: string;
  dominioPersonalizado?: string;
  pais: string;
  sistema: string;
  idiomaPrincipal?: string;
  logoUrl?: string;
  colorPrimario: string;
  colorSecundario: string;
  activo: boolean;
  autogestionActividades: boolean;
  codigoCentro?: string;
  distritoEducativo?: string;
  regionalEducacion?: string;
  createdAt: string;
  director: Director;
}

const formatIdioma = (idioma?: string) => {
  const map: Record<string, string> = {
    ESPANOL: 'Español',
    INGLES: 'Inglés / English',
    FRANCES: 'Français',
    KREYOL: 'Kreyòl',
  };
  return idioma ? map[idioma] || idioma : 'No especificado';
};

export default function VerInstitucionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [institucion, setInstitucion] = useState<Institucion | null>(null);
  const [historial, setHistorial] = useState<HistorialDirector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [instRes, historialRes] = await Promise.all([
        institucionesApi.getById(id),
        adminApi.getDirectorHistory(id).catch(() => ({ data: { data: [] } })),
      ]);

      setInstitucion(instRes.data);
      setHistorial(historialRes.data?.data || []);
    } catch (err) {
      console.error('Error cargando institucion:', err);
      setError('No se pudo cargar la institucion');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatSistema = (sistema: string) => {
    const map: Record<string, string> = {
      PRIMARIA_DO: 'Primaria (Rep. Dominicana)',
      SECUNDARIA_GENERAL_DO: 'Secundaria General (Rep. Dominicana)',
      POLITECNICO_DO: 'Politecnico (Rep. Dominicana)',
      PRIMARIA_HT: 'Primaria (Haiti)',
      SECUNDARIA_HT: 'Secundaria (Haiti)',
    };
    return map[sistema] || sistema;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !institucion) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">Institucion no encontrada</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/dashboard/admin/instituciones">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a instituciones
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/instituciones">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{institucion.nombre}</h1>
          {institucion.lema && (
            <p className="text-muted-foreground italic">{institucion.lema}</p>
          )}
        </div>
        <Link href={`/dashboard/admin/instituciones/${id}/editar`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Info principal */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo y Colores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Identidad Visual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {institucion.logoUrl ? (
                <div className="w-24 h-24 rounded-lg overflow-hidden border">
                  <Image
                    src={getMediaUrl(institucion.logoUrl)}
                    alt={institucion.nombre}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${institucion.colorPrimario}20` }}
                >
                  <Building2
                    className="w-12 h-12"
                    style={{ color: institucion.colorPrimario }}
                  />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Colores:</p>
                <div className="flex gap-2">
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: institucion.colorPrimario }}
                    title={`Primario: ${institucion.colorPrimario}`}
                  />
                  <div
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: institucion.colorSecundario }}
                    title={`Secundario: ${institucion.colorSecundario}`}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos generales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Informacion General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pais:</span>
              <span>{institucion.pais === 'DO' ? 'Rep. Dominicana' : 'Haiti'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sistema:</span>
              <span>{formatSistema(institucion.sistema)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Idioma:</span>
              <span>{formatIdioma(institucion.idiomaPrincipal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                institucion.activo
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {institucion.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Autogestion:</span>
              <span>{institucion.autogestionActividades ? 'Si' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creada:</span>
              <span>{formatDate(institucion.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            URLs y Acceso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Slug:</span>
            <code className="px-2 py-1 bg-slate-100 rounded text-sm">/{institucion.slug}</code>
          </div>
          {institucion.dominioPersonalizado && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Dominio:</span>
              <code className="px-2 py-1 bg-slate-100 rounded text-sm">
                {institucion.dominioPersonalizado}
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Director actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Director Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {institucion.director.nombre} {institucion.director.apellido}
              </p>
              {institucion.director.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {institucion.director.email}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de directores */}
      {historial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Directores
            </CardTitle>
            <CardDescription>
              Registro de todos los directores que han gestionado esta institucion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historial.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {h.director.nombre} {h.director.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(h.fechaInicio)}
                      {h.fechaFin ? ` - ${formatDate(h.fechaFin)}` : ' - Actual'}
                    </p>
                  </div>
                  {h.motivo && (
                    <span className="text-xs text-muted-foreground">{h.motivo}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datos ministeriales */}
      {(institucion.codigoCentro || institucion.distritoEducativo || institucion.regionalEducacion) && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Ministeriales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {institucion.codigoCentro && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Codigo de Centro:</span>
                <span>{institucion.codigoCentro}</span>
              </div>
            )}
            {institucion.distritoEducativo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distrito Educativo:</span>
                <span>{institucion.distritoEducativo}</span>
              </div>
            )}
            {institucion.regionalEducacion && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Regional de Educacion:</span>
                <span>{institucion.regionalEducacion}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
