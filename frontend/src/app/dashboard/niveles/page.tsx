'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nivelesApi } from '@/lib/api';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
} from 'lucide-react';

interface Nivel {
  id: string;
  nombre: string;
  orden?: number;
  descripcion?: string;
  createdAt: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function NivelesPage() {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    orden: 0,
    descripcion: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchNiveles();
  }, []);

  const fetchNiveles = async () => {
    try {
      const response = await nivelesApi.getAll();
      const data = response.data.data || response.data || [];
      // Ordenar por orden ascendente
      setNiveles(data.sort((a: Nivel, b: Nivel) => (a.orden || 0) - (b.orden || 0)));
    } catch (error) {
      console.error('Error cargando niveles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        orden: formData.orden || niveles.length + 1,
      };

      if (editingId) {
        await nivelesApi.update(editingId, payload);
        setNiveles(niveles.map(n =>
          n.id === editingId ? { ...n, ...payload } : n
        ).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      } else {
        const response = await nivelesApi.create(payload);
        const newNivel = response.data.data || response.data;
        setNiveles([...niveles, newNivel].sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      }
      resetForm();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al guardar nivel');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (nivel: Nivel) => {
    setFormData({
      nombre: nivel.nombre,
      orden: nivel.orden || 0,
      descripcion: nivel.descripcion || '',
    });
    setEditingId(nivel.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este nivel?')) return;

    try {
      await nivelesApi.delete(id);
      setNiveles(niveles.filter(n => n.id !== id));
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al eliminar nivel');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', orden: 0, descripcion: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const openNewModal = () => {
    setFormData({
      nombre: '',
      orden: niveles.length + 1,
      descripcion: ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const filteredNiveles = niveles.filter(n =>
    n.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Niveles</h1>
          <p className="text-muted-foreground">
            Gestiona los niveles educativos (grados, cursos) de tu institución
          </p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Nivel
        </Button>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Niveles */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredNiveles.length > 0 ? (
            filteredNiveles.map((nivel) => (
              <Card key={nivel.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {nivel.orden || '-'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{nivel.nombre}</p>
                      {nivel.descripcion && (
                        <p className="text-sm text-muted-foreground">{nivel.descripcion}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(nivel)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(nivel.id)}
                        title="Eliminar"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay niveles</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No se encontraron resultados'
                    : 'Comienza creando tu primer nivel'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingId ? 'Editar Nivel' : 'Nuevo Nivel'}
                </h2>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: 1ro de Primaria, 7mo Grado, etc."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    min="1"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 0 })}
                    placeholder="Posición en la lista"
                  />
                  <p className="text-xs text-muted-foreground">
                    El orden determina cómo se muestran los niveles en las listas
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Breve descripción del nivel"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? 'Guardar Cambios' : 'Crear Nivel'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
