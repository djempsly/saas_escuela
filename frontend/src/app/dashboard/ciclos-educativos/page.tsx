'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ciclosEducativosApi, nivelesApi, coordinadoresApi } from '@/lib/api';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
  Users,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface CicloEducativo {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  niveles: { id: string; nombre: string }[];
  coordinadores: { id: string; nombre: string; apellido: string }[];
}

interface Nivel {
  id: string;
  nombre: string;
  cicloEducativo?: { id: string; nombre: string } | null;
}

interface Coordinador {
  id: string;
  nombre: string;
  apellido: string;
  role: string;
}

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

export default function CiclosEducativosPage() {
  const [ciclos, setCiclos] = useState<CicloEducativo[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<'niveles' | 'coordinadores' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCiclo, setSelectedCiclo] = useState<CicloEducativo | null>(null);
  const [expandedCiclos, setExpandedCiclos] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: 1,
  });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ciclosRes, nivelesRes, coordsRes] = await Promise.all([
        ciclosEducativosApi.getAll(),
        nivelesApi.getAll(),
        coordinadoresApi.getAll(),
      ]);
      setCiclos(ciclosRes.data || []);
      setNiveles(nivelesRes.data || []);
      setCoordinadores(coordsRes.data?.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingId) {
        await ciclosEducativosApi.update(editingId, formData);
      } else {
        await ciclosEducativosApi.create(formData);
      }
      await fetchData();
      resetForm();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (ciclo: CicloEducativo) => {
    setFormData({
      nombre: ciclo.nombre,
      descripcion: ciclo.descripcion || '',
      orden: ciclo.orden,
    });
    setEditingId(ciclo.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ciclo educativo?')) return;

    try {
      await ciclosEducativosApi.delete(id);
      setCiclos(ciclos.filter((c) => c.id !== id));
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al eliminar');
    }
  };

  const openAssignModal = (ciclo: CicloEducativo, type: 'niveles' | 'coordinadores') => {
    setSelectedCiclo(ciclo);
    if (type === 'niveles') {
      setSelectedItems(ciclo.niveles.map((n) => n.id));
    } else {
      setSelectedItems(ciclo.coordinadores.map((c) => c.id));
    }
    setShowAssignModal(type);
  };

  const handleAssign = async () => {
    if (!selectedCiclo) return;
    setIsSaving(true);

    try {
      if (showAssignModal === 'niveles') {
        await ciclosEducativosApi.assignNiveles(selectedCiclo.id, selectedItems);
      } else {
        await ciclosEducativosApi.assignCoordinadores(selectedCiclo.id, selectedItems);
      }
      await fetchData();
      setShowAssignModal(null);
      setSelectedCiclo(null);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al asignar');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCiclos);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCiclos(newExpanded);
  };

  const resetForm = () => {
    setFormData({ nombre: '', descripcion: '', orden: ciclos.length + 1 });
    setEditingId(null);
    setShowModal(false);
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Get niveles not assigned to any ciclo
  const availableNiveles = niveles.filter(
    (n) => !n.cicloEducativo || n.cicloEducativo.id === selectedCiclo?.id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ciclos Educativos</h1>
          <p className="text-muted-foreground">
            Agrupa niveles en ciclos educativos (1er Ciclo, 2do Ciclo, etc.)
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ciclo
        </Button>
      </div>

      {/* Lista de Ciclos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : ciclos.length > 0 ? (
        <div className="space-y-3">
          {ciclos.map((ciclo) => (
            <Card key={ciclo.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleExpand(ciclo.id)}
                    className="mt-1 p-1 hover:bg-slate-100 rounded"
                  >
                    {expandedCiclos.has(ciclo.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {ciclo.orden}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{ciclo.nombre}</p>
                    {ciclo.descripcion && (
                      <p className="text-sm text-muted-foreground">{ciclo.descripcion}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{ciclo.niveles.length} niveles</span>
                      <span>{ciclo.coordinadores.length} coordinadores</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignModal(ciclo, 'niveles')}
                    >
                      <Layers className="w-4 h-4 mr-1" />
                      Niveles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignModal(ciclo, 'coordinadores')}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Coords
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ciclo)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ciclo.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedCiclos.has(ciclo.id) && (
                  <div className="mt-4 ml-14 grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Niveles</h4>
                      {ciclo.niveles.length > 0 ? (
                        <div className="space-y-1">
                          {ciclo.niveles.map((n) => (
                            <div key={n.id} className="text-sm p-2 bg-slate-50 rounded">
                              {n.nombre}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin niveles asignados</p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Coordinadores</h4>
                      {ciclo.coordinadores.length > 0 ? (
                        <div className="space-y-1">
                          {ciclo.coordinadores.map((c) => (
                            <div key={c.id} className="text-sm p-2 bg-slate-50 rounded">
                              {c.nombre} {c.apellido}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin coordinadores asignados</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay ciclos educativos</h3>
            <p className="text-muted-foreground">
              Crea ciclos para agrupar niveles (ej: 1er Ciclo para 1ro-3ro)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingId ? 'Editar Ciclo' : 'Nuevo Ciclo Educativo'}
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
                    placeholder="Ej: 1er Ciclo, 2do Ciclo"
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
                    onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripcion</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripcion opcional"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? 'Guardar' : 'Crear'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Asignar */}
      {showAssignModal && selectedCiclo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg">
                Asignar {showAssignModal === 'niveles' ? 'Niveles' : 'Coordinadores'} a {selectedCiclo.nombre}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-auto">
                {showAssignModal === 'niveles' ? (
                  availableNiveles.length > 0 ? (
                    availableNiveles.map((nivel) => (
                      <label
                        key={nivel.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(nivel.id)}
                          onChange={() => toggleItem(nivel.id)}
                          className="w-4 h-4"
                        />
                        <span>{nivel.nombre}</span>
                        {nivel.cicloEducativo && nivel.cicloEducativo.id !== selectedCiclo.id && (
                          <span className="text-xs text-muted-foreground">
                            (En: {nivel.cicloEducativo.nombre})
                          </span>
                        )}
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay niveles disponibles
                    </p>
                  )
                ) : (
                  coordinadores.length > 0 ? (
                    coordinadores.map((coord) => (
                      <label
                        key={coord.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(coord.id)}
                          onChange={() => toggleItem(coord.id)}
                          className="w-4 h-4"
                        />
                        <span>{coord.nombre} {coord.apellido}</span>
                        <span className="text-xs text-muted-foreground">({coord.role})</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay coordinadores disponibles
                    </p>
                  )
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowAssignModal(null); setSelectedCiclo(null); }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleAssign} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
