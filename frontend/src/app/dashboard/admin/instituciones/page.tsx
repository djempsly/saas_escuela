'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { institucionesApi, getMediaUrl } from '@/lib/api';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Eye,
  Users,
  Power,
  PowerOff,
  ExternalLink,
  Globe,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface Dominio {
  id: string;
  dominio: string;
  verificado: boolean;
  verificadoAt?: string;
}

interface Institucion {
  id: string;
  nombre: string;
  pais: string;
  sistemaEducativo: string;
  sistema?: string;
  logoUrl?: string;
  colorPrimario?: string;
  activo: boolean;
  slug?: string;
  dominioPersonalizado?: string;
  dominios?: Dominio[];
  _count?: {
    usuarios: number;
  };
}

export default function AdminInstitucionesPage() {
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleToggleActivo = async (inst: Institucion) => {
    try {
      setMessage(null);
      await institucionesApi.updateSensitive(inst.id, { activo: !inst.activo });
      setInstituciones(
        instituciones.map((i) =>
          i.id === inst.id ? { ...i, activo: !inst.activo } : i
        )
      );
      setMessage({
        type: 'success',
        text: `Institucion ${!inst.activo ? 'activada' : 'desactivada'} correctamente`,
      });
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al cambiar el estado',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const inst = instituciones.find((i) => i.id === id);
    if (!confirm(
      `¿Estas seguro de eliminar "${inst?.nombre}"?\n\n` +
      `Esta accion no se puede deshacer. Si la institucion tiene usuarios u otros datos, ` +
      `considera desactivarla en lugar de eliminarla.`
    )) {
      return;
    }
    try {
      setMessage(null);
      await institucionesApi.delete(id);
      setInstituciones(instituciones.filter((i) => i.id !== id));
      setMessage({ type: 'success', text: 'Institucion eliminada correctamente' });
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error eliminando:', error);
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al eliminar la institucion',
      });
    }
  };

  const getLandingUrl = (inst: Institucion) => {
    // First check for verified custom domains
    const verifiedDomain = inst.dominios?.find(d => d.verificado);
    if (verifiedDomain) {
      return `https://${verifiedDomain.dominio}`;
    }
    // Fallback to dominioPersonalizado (legacy field)
    if (inst.dominioPersonalizado) {
      return `https://${inst.dominioPersonalizado}`;
    }
    // Fallback to slug subdomain
    if (inst.slug) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'escuela.app';
      return `https://${inst.slug}.${baseUrl}`;
    }
    return null;
  };

  const filteredInstituciones = instituciones.filter(
    (i) =>
      i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.pais.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.slug?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSistema = (sistema: string) => {
    const map: Record<string, string> = {
      PRIMARIA_DO: 'RD - Primaria',
      SECUNDARIA_GENERAL_DO: 'RD - Secundaria General',
      POLITECNICO_DO: 'RD - Politécnico',
      INICIAL_DO: 'RD - Nivel Inicial',
      PRIMARIA_HT: 'Haití - Primaria',
      SECUNDARIA_HT: 'Haití - Secundaria',
      INICIAL_HT: 'Haití - Nivel Inicial',
    };
    return map[sistema] || sistema;
  };

  const renderDominios = (inst: Institucion) => {
    const dominios = inst.dominios || [];
    const hasLegacyDominio = inst.dominioPersonalizado && dominios.length === 0;

    if (dominios.length === 0 && !hasLegacyDominio) {
      return (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Globe className="w-3 h-3" />
          Solo subdomain
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {dominios.map((d) => (
          <Badge
            key={d.id}
            variant={d.verificado ? 'default' : 'secondary'}
            className={`text-xs flex items-center gap-1 ${
              d.verificado
                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {d.verificado ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {d.dominio}
          </Badge>
        ))}
        {hasLegacyDominio && (
          <Badge
            variant="secondary"
            className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700"
          >
            <Globe className="w-3 h-3" />
            {inst.dominioPersonalizado}
          </Badge>
        )}
      </div>
    );
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

      {/* Mensaje */}
      {message && (
        <div
          className={`p-4 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Busqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, pais o slug..."
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
          {filteredInstituciones.map((inst) => {
            const landingUrl = getLandingUrl(inst);

            return (
              <Card key={inst.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    {inst.logoUrl ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0 bg-white">
                        <Image
                          src={getMediaUrl(inst.logoUrl)}
                          alt={inst.nombre}
                          width={64}
                          height={64}
                          className="object-contain w-full h-full"
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
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-lg truncate">{inst.nombre}</h3>
                          {inst.slug && (
                            <p className="text-sm text-muted-foreground font-mono">
                              /{inst.slug}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Link href={`/dashboard/admin/instituciones/${inst.id}`}>
                            <Button variant="ghost" size="icon" title="Ver detalles">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/admin/instituciones/${inst.id}/editar`}>
                            <Button variant="ghost" size="icon" title="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          {landingUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver landing"
                              onClick={() => window.open(landingUrl, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={inst.activo ? 'text-amber-500 hover:text-amber-600' : 'text-green-500 hover:text-green-600'}
                            onClick={() => handleToggleActivo(inst)}
                            title={inst.activo ? 'Desactivar' : 'Activar'}
                          >
                            {inst.activo ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(inst.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                          {inst.pais === 'DO' ? '🇩🇴 Rep. Dominicana' : '🇭🇹 Haití'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                          {formatSistema(inst.sistemaEducativo || inst.sistema || '')}
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
                        {inst._count && (
                          <span className="text-xs px-2 py-1 bg-slate-100 rounded-full flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {inst._count.usuarios} usuarios
                          </span>
                        )}
                      </div>

                      {/* Dominios */}
                      <div className="pt-1">
                        {renderDominios(inst)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
