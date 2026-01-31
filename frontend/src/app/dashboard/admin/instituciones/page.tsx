'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { institucionesApi } from '@/lib/api';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Eye,
  Users,
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

export default function AdminInstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInstituciones();
  }, []);

  const fetchInstituciones = async () => {
    try {
      const response = await institucionesApi.getAll();
      setInstituciones(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando instituciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta institución? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await institucionesApi.delete(id);
      setInstituciones(instituciones.filter((i) => i.id !== id));
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('Error al eliminar la institución');
    }
  };

  const filteredInstituciones = instituciones.filter(
    (i) =>
      i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.pais.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSistema = (sistema: string) => {
    const map: Record<string, string> = {
      PRIMARIA_DO: 'RD - Primaria',
      SECUNDARIA_GENERAL_DO: 'RD - Secundaria General',
      POLITECNICO_DO: 'RD - Politécnico',
      PRIMARIA_HT: 'Haití - Primaria',
      SECUNDARIA_HT: 'Haití - Secundaria',
    };
    return map[sistema] || sistema;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instituciones</h1>
          <p className="text-muted-foreground">
            Gestiona todas las instituciones educativas del sistema
          </p>
        </div>
        <Link href="/dashboard/admin/instituciones/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Institución
          </Button>
        </Link>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o país..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Instituciones */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredInstituciones.length > 0 ? (
        <div className="grid gap-4">
          {filteredInstituciones.map((inst) => (
            <Card key={inst.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  {inst.logoUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0">
                      <Image
                        src={inst.logoUrl}
                        alt={inst.nombre}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${inst.colorPrimario || '#1a365d'}20` }}
                    >
                      <Building2
                        className="w-8 h-8"
                        style={{ color: inst.colorPrimario || '#1a365d' }}
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{inst.nombre}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                        {inst.pais === 'DO' ? '🇩🇴 Rep. Dominicana' : '🇭🇹 Haití'}
                      </span>
                      <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                        {formatSistema(inst.sistemaEducativo)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          inst.activo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {inst.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    {inst._count && (
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {inst._count.users} usuarios
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/admin/instituciones/${inst.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/admin/instituciones/${inst.id}/editar`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(inst.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay instituciones</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Comienza creando tu primera institución educativa'}
            </p>
            {!searchTerm && (
              <Link href="/dashboard/admin/instituciones/nueva">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Institución
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
