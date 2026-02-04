'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { institucionesApi, getMediaUrl } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import {
  Building2,
  Search,
  Settings,
  Users,
  Loader2,
  Edit,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Institucion {
  id: string;
  nombre: string;
  pais: string;
  sistemaEducativo: string;
  logoUrl?: string;
  colorPrimario?: string;
  activo: boolean;
  _count?: {
    users: number;
  };
}

export default function InstitucionesPage() {
  const { user } = useAuthStore();
  const { branding } = useInstitutionStore();
  const [institucion, setInstitucion] = useState<Institucion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInstitucion = async () => {
      if (!user?.institucionId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await institucionesApi.getById(user.institucionId);
        setInstitucion(response.data.data || response.data);
      } catch (error) {
        console.error('Error cargando institución:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstitucion();
  }, [user?.institucionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!institucion) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin Institución Asignada</h2>
        <p className="text-muted-foreground">
          No tienes una institución asignada a tu cuenta.
        </p>
      </div>
    );
  }

  const primaryColor = branding?.colorPrimario || '#1a365d';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Institución</h1>
          <p className="text-muted-foreground">
            Información y configuración de tu centro educativo
          </p>
        </div>
        {(user?.role === 'DIRECTOR' || user?.role === 'ADMIN') && (
          <Link href="/dashboard/configuracion">
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>
          </Link>
        )}
      </div>

      {/* Información Principal */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {institucion.logoUrl ? (
                <div className="w-32 h-32 rounded-lg overflow-hidden border">
                  <Image
                    src={getMediaUrl(institucion.logoUrl)}
                    alt={institucion.nombre}
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="w-32 h-32 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Building2 className="w-16 h-16" style={{ color: primaryColor }} />
                </div>
              )}
            </div>

            {/* Datos */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{institucion.nombre}</h2>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {institucion.pais === 'DO' ? 'República Dominicana' : 'Haití'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Sistema Educativo</p>
                  <p className="font-medium text-sm">
                    {institucion.sistemaEducativo.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                  <p className="font-medium text-sm">
                    {institucion._count?.users || 0} registrados
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      institucion.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {institucion.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>

              {/* Colores de marca */}
              {branding && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Colores:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: branding.colorPrimario }}
                      title="Color Primario"
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: branding.colorSecundario }}
                      title="Color Secundario"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/usuarios">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Usuarios</CardTitle>
                <CardDescription>Gestionar personal y estudiantes</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/clases">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base">Clases</CardTitle>
                <CardDescription>Administrar aulas y materias</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/configuracion">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base">Configuración</CardTitle>
                <CardDescription>Personalizar institución</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
