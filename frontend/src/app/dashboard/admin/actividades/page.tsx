'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { actividadesApi, institucionesApi } from '@/lib/api';
import {
  Plus,
  Loader2,
  BookOpen,
  Trash2,
  Edit,
  Globe,
  Building2,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';

interface Actividad {
  id: string;
  titulo: string;
  contenido: string;
  urlArchivo?: string;
  publicado: boolean;
  createdAt: string;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
  };
  institucion?: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
}

interface Institucion {
  id: string;
  nombre: string;
  slug: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function AdminActividadesPage() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstitucion, setFilterInstitucion] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    institucionId: '',
    publicado: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [actividadesRes, institucionesRes] = await Promise.all([
        actividadesApi.getAll(100),
        institucionesApi.getAll(),
      ]);

      setActividades(actividadesRes.data || []);
      const instData = institucionesRes.data.data || institucionesRes.data || [];
      setInstituciones(instData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const formPayload = new FormData();
      formPayload.append('titulo', formData.titulo);
      formPayload.append('contenido', formData.contenido);
      formPayload.append('publicado', String(formData.publicado));
      if (formData.institucionId && formData.institucionId !== 'global') {
        formPayload.append('institucionId', formData.institucionId);
      }

      if (editingActividad) {
        await actividadesApi.update(editingActividad.id, formPayload);
        setMessage({ type: 'success', text: 'Actividad actualizada correctamente' });
      } else {
        await actividadesApi.create(formPayload);
        setMessage({ type: 'success', text: 'Actividad creada correctamente' });
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al guardar la actividad',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta actividad?')) return;

    try {
      await actividadesApi.delete(id);
      setMessage({ type: 'success', text: 'Actividad eliminada correctamente' });
      fetchData();
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al eliminar la actividad',
      });
    }
  };

  const openEditModal = (actividad: Actividad) => {
    setEditingActividad(actividad);
    setFormData({
      titulo: actividad.titulo,
      contenido: actividad.contenido,
      institucionId: actividad.institucion?.id || 'global',
      publicado: actividad.publicado,
    });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingActividad(null);
    setFormData({
      titulo: '',
      contenido: '',
      institucionId: '',
      publicado: true,
    });
  };

  const filteredActividades = actividades.filter((act) => {
    const matchesSearch =
      act.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      act.contenido.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterInstitucion === 'all' ||
      (filterInstitucion === 'global' && !act.institucion) ||
      act.institucion?.id === filterInstitucion;

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Actividades Globales</h1>
          <p className="text-muted-foreground">
            Gestiona las actividades que aparecen en la landing page
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Actividad
        </Button>
      </div>

      {/* Message */}
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar actividades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterInstitucion} onValueChange={setFilterInstitucion}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por institución" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="global">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Globales
                  </span>
                </SelectItem>
                {instituciones.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {inst.nombre}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actividades List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Actividades ({filteredActividades.length})
          </CardTitle>
          <CardDescription>
            Lista de todas las actividades del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredActividades.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay actividades</p>
              <Button variant="outline" className="mt-4" onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primera actividad
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActividades.map((actividad) => (
                <div
                  key={actividad.id}
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{actividad.titulo}</h3>
                      {actividad.publicado ? (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          <Eye className="w-3 h-3" />
                          Publicado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          <EyeOff className="w-3 h-3" />
                          Borrador
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {actividad.contenido}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Por: {actividad.autor.nombre} {actividad.autor.apellido}</span>
                      <span>{formatDate(actividad.createdAt)}</span>
                      {actividad.institucion ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {actividad.institucion.nombre}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Globe className="w-3 h-3" />
                          Global
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(actividad)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(actividad.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}
            </DialogTitle>
            <DialogDescription>
              {editingActividad
                ? 'Modifica los datos de la actividad'
                : 'Crea una nueva actividad para la landing page'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Titulo de la actividad"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contenido">Contenido</Label>
              <Textarea
                id="contenido"
                value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                placeholder="Descripción de la actividad..."
                rows={5}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="institucion">Institución</Label>
                <Select
                  value={formData.institucionId || 'global'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, institucionId: value === 'global' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar institución" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Global (Landing principal)
                      </span>
                    </SelectItem>
                    {instituciones.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {inst.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.publicado ? 'publicado' : 'borrador'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, publicado: value === 'publicado' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publicado">
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Publicado
                      </span>
                    </SelectItem>
                    <SelectItem value="borrador">
                      <span className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        Borrador
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : editingActividad ? (
                  'Actualizar'
                ) : (
                  'Crear'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
