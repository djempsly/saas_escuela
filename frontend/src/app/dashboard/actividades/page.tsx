'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { actividadesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Activity,
  Plus,
  Search,
  Calendar,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Actividad {
  id: string;
  titulo: string;
  contenido: string;
  urlArchivo?: string;
  createdAt: string;
  autor: {
    nombre: string;
    apellido: string;
  };
}

export default function ActividadesPage() {
  const { user } = useAuthStore();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = ['ADMIN', 'DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO'].includes(
    user?.role || ''
  );

  useEffect(() => {
    const fetchActividades = async () => {
      try {
        const response = await actividadesApi.getAll();
        setActividades(response.data.data || response.data || []);
      } catch (error) {
        console.error('Error cargando actividades:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActividades();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      const response = await actividadesApi.getAll();
      setActividades(response.data.data || response.data || []);
      return;
    }

    try {
      setIsLoading(true);
      const response = await actividadesApi.search(searchTerm);
      setActividades(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error buscando:', error);
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;

    try {
      // await actividadesApi.delete(id);
      setActividades(actividades.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Error eliminando:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actividades</h1>
          <p className="text-muted-foreground">
            Noticias y eventos de la institución
          </p>
        </div>
        {canManage && (
          <Link href="/dashboard/actividades/nueva">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Actividad
            </Button>
          </Link>
        )}
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar actividades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Actividades */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : actividades.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {actividades.map((actividad) => (
            <Card key={actividad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                <CardTitle className="text-lg line-clamp-2">
                  {actividad.titulo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {actividad.contenido}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Por: {actividad.autor.nombre} {actividad.autor.apellido}
                  </p>
                  {canManage && (
                    <div className="flex gap-1">
                      <Link href={`/dashboard/actividades/${actividad.id}/editar`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(actividad.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay actividades</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Aún no se han publicado actividades'}
            </p>
            {canManage && !searchTerm && (
              <Link href="/dashboard/actividades/nueva">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Actividad
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
