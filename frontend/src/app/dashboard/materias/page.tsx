'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { materiasApi } from '@/lib/api';
import {
  BookMarked,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
} from 'lucide-react';

interface Materia {
  id: string;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  tipo: 'GENERAL' | 'TECNICA';
  esOficial?: boolean;
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

export default function MateriasPage() {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    tipo: 'GENERAL' as 'GENERAL' | 'TECNICA',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMaterias();
  }, []);

  const fetchMaterias = async () => {
    try {
      const response = await materiasApi.getAll();
      setMaterias(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando materias:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingId) {
        await materiasApi.update(editingId, formData);
        setMaterias(materias.map(m =>
          m.id === editingId ? { ...m, ...formData } : m
        ));
      } else {
        const response = await materiasApi.create(formData);
        const newMateria = response.data.data || response.data;
        setMaterias([newMateria, ...materias]);
      }
      resetForm();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al guardar materia');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (materia: Materia) => {
    setFormData({
      nombre: materia.nombre,
      codigo: materia.codigo || '',
      descripcion: materia.descripcion || '',
      tipo: materia.tipo || 'GENERAL',
    });
    setEditingId(materia.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta materia?')) return;

    try {
      await materiasApi.delete(id);
      setMaterias(materias.filter(m => m.id !== id));
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al eliminar materia');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', codigo: '', descripcion: '', tipo: 'GENERAL' });
    setEditingId(null);
    setShowModal(false);
  };

  const filteredMaterias = materias.filter(m =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.codigo && m.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materias</h1>
          <p className="text-muted-foreground">
            Gestiona las materias de tu institución
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Materia
        </Button>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Materias */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredMaterias.length > 0 ? (
            filteredMaterias.map((materia) => (
              <Card key={materia.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookMarked className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{materia.nombre}</p>
                        <Badge variant={materia.tipo === 'TECNICA' ? 'default' : 'secondary'} className="text-xs">
                          {materia.tipo === 'TECNICA' ? 'Técnica' : 'General'}
                        </Badge>
                        {materia.esOficial && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                            Oficial
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {materia.codigo && <span>Código: {materia.codigo}</span>}
                        {materia.descripcion && <span>• {materia.descripcion}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(materia)}
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(materia.id)}
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
                <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay materias</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'No se encontraron resultados'
                    : 'Comienza creando tu primera materia'}
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
                  {editingId ? 'Editar Materia' : 'Nueva Materia'}
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
                    placeholder="Ej: Matemáticas"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código (opcional)</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej: MAT-101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Breve descripción de la materia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Materia *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'GENERAL' | 'TECNICA') => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General (Formación Fundamental)</SelectItem>
                      <SelectItem value="TECNICA">Técnica (Módulo Formativo - Politécnico)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Las materias técnicas aparecen en la sección de Módulos Formativos del boletín
                  </p>
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
                        {editingId ? 'Guardar Cambios' : 'Crear Materia'}
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
