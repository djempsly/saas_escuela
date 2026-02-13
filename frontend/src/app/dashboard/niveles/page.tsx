'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nivelesApi, ciclosEducativosApi } from '@/lib/api';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
  Wand2,
  CheckCircle2,
} from 'lucide-react';

interface CicloEducativo {
  id: string;
  nombre: string;
}

interface Nivel {
  id: string;
  nombre: string;
  orden?: number;
  descripcion?: string;
  cicloEducativo?: CicloEducativo | null;
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
  const [ciclosEducativos, setCiclosEducativos] = useState<CicloEducativo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    orden: 0,
    descripcion: '',
    cicloEducativoId: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [generarTipo, setGenerarTipo] = useState('');
  const [isGenerando, setIsGenerando] = useState(false);
  const [generarResult, setGenerarResult] = useState<{
    ciclosCreados: { id: string; nombre: string }[];
    nivelesCreados: { id: string; nombre: string }[];
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [nivelesRes, ciclosRes] = await Promise.all([
        nivelesApi.getAll(),
        ciclosEducativosApi.getAll(),
      ]);
      const data = nivelesRes.data.data || nivelesRes.data || [];
      setNiveles(data.sort((a: Nivel, b: Nivel) => (a.orden || 0) - (b.orden || 0)));
      setCiclosEducativos(ciclosRes.data || []);
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
      const payload = {
        nombre: formData.nombre,
        orden: formData.orden || niveles.length + 1,
        descripcion: formData.descripcion || undefined,
        cicloEducativoId: formData.cicloEducativoId || null,
      };

      if (editingId) {
        await nivelesApi.update(editingId, payload);
      } else {
        await nivelesApi.create(payload);
      }
      await fetchData();
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
      cicloEducativoId: nivel.cicloEducativo?.id || '',
    });
    setEditingId(nivel.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estas seguro de eliminar este nivel?')) return;

    try {
      await nivelesApi.delete(id);
      setNiveles(niveles.filter(n => n.id !== id));
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al eliminar nivel');
    }
  };

  const handleCicloChange = async (nivelId: string, cicloEducativoId: string) => {
    try {
      await nivelesApi.update(nivelId, { cicloEducativoId: cicloEducativoId || null });
      await fetchData();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al asignar ciclo');
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', orden: 0, descripcion: '', cicloEducativoId: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const handleGenerarEstructura = async () => {
    if (!generarTipo) return;
    setIsGenerando(true);
    setGenerarResult(null);
    try {
      const res = await ciclosEducativosApi.generarEstructura(generarTipo);
      setGenerarResult(res.data);
      await fetchData();
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al generar estructura');
    } finally {
      setIsGenerando(false);
    }
  };

  const closeGenerarModal = () => {
    setShowGenerarModal(false);
    setGenerarTipo('');
    setGenerarResult(null);
  };

  const openNewModal = () => {
    setFormData({
      nombre: '',
      orden: niveles.length + 1,
      descripcion: '',
      cicloEducativoId: '',
    });
    setEditingId(null);
    setShowModal(true);
  };

  const filteredNiveles = niveles.filter(n =>
    n.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group niveles by ciclo educativo
  const nivelesByCiclo = new Map<string, Nivel[]>();
  const nivelesWithoutCiclo: Nivel[] = [];

  filteredNiveles.forEach(nivel => {
    if (nivel.cicloEducativo) {
      const key = nivel.cicloEducativo.id;
      if (!nivelesByCiclo.has(key)) {
        nivelesByCiclo.set(key, []);
      }
      nivelesByCiclo.get(key)!.push(nivel);
    } else {
      nivelesWithoutCiclo.push(nivel);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Niveles</h1>
          <p className="text-muted-foreground">
            Gestiona los niveles educativos (grados, cursos) de tu institucion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowGenerarModal(true)}>
            <Wand2 className="w-4 h-4 mr-2" />
            Generar Estructura
          </Button>
          <Button onClick={openNewModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Nivel
          </Button>
        </div>
      </div>

      {/* Busqueda */}
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
        <div className="space-y-6">
          {/* Niveles agrupados por ciclo educativo */}
          {Array.from(nivelesByCiclo.entries()).map(([cicloId, nivelesGrupo]) => {
            const ciclo = ciclosEducativos.find(c => c.id === cicloId);
            return (
              <div key={cicloId}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {ciclo?.nombre || 'Ciclo desconocido'}
                </h3>
                <div className="grid gap-3">
                  {nivelesGrupo.map((nivel) => (
                    <NivelCard
                      key={nivel.id}
                      nivel={nivel}
                      ciclosEducativos={ciclosEducativos}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onCicloChange={handleCicloChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Niveles sin ciclo */}
          {nivelesWithoutCiclo.length > 0 && (
            <div>
              {nivelesByCiclo.size > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Sin ciclo educativo asignado
                </h3>
              )}
              <div className="grid gap-3">
                {nivelesWithoutCiclo.map((nivel) => (
                  <NivelCard
                    key={nivel.id}
                    nivel={nivel}
                    ciclosEducativos={ciclosEducativos}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onCicloChange={handleCicloChange}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredNiveles.length === 0 && (
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
                    placeholder="Posicion en la lista"
                  />
                  <p className="text-xs text-muted-foreground">
                    El orden determina como se muestran los niveles en las listas
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cicloEducativo">Ciclo Educativo</Label>
                  <select
                    id="cicloEducativo"
                    value={formData.cicloEducativoId}
                    onChange={(e) => setFormData({ ...formData, cicloEducativoId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">-- Sin ciclo --</option>
                    {ciclosEducativos.map((ciclo) => (
                      <option key={ciclo.id} value={ciclo.id}>
                        {ciclo.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripcion (opcional)</Label>
                  <Input
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Breve descripcion del nivel"
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

      {/* Modal Generar Estructura */}
      {showGenerarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Generar Estructura Academica</h2>
                <Button variant="ghost" size="icon" onClick={closeGenerarModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {generarResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-medium">Estructura generada exitosamente</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Se crearon {generarResult.ciclosCreados.length} ciclo(s) y{' '}
                    {generarResult.nivelesCreados.length} nivel(es).
                  </p>
                  {generarResult.ciclosCreados.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Ciclos creados:</p>
                      <ul className="text-sm text-muted-foreground list-disc pl-5">
                        {generarResult.ciclosCreados.map((c) => (
                          <li key={c.id}>{c.nombre}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium mb-1">Niveles creados:</p>
                    <ul className="text-sm text-muted-foreground list-disc pl-5">
                      {generarResult.nivelesCreados.map((n) => (
                        <li key={n.id}>{n.nombre}</li>
                      ))}
                    </ul>
                  </div>
                  <Button className="w-full" onClick={closeGenerarModal}>
                    Cerrar
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Selecciona un tipo de nivel educativo para generar automaticamente
                    los ciclos y grados correspondientes segun el MINERD.
                  </p>
                  <div className="space-y-2">
                    <Label>Tipo de nivel educativo</Label>
                    <select
                      value={generarTipo}
                      onChange={(e) => setGenerarTipo(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">-- Seleccionar --</option>
                      <option value="INICIAL">Inicial</option>
                      <option value="PRIMARIA">Primaria</option>
                      <option value="SECUNDARIA">Secundaria</option>
                      <option value="POLITECNICO">Politecnico</option>
                    </select>
                  </div>

                  {generarTipo && (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                      <p className="font-medium">Se creara:</p>
                      {generarTipo === 'INICIAL' && (
                        <p className="text-muted-foreground">
                          3 niveles: Pre-Kinder, Kinder, Pre-Primario (sin ciclos)
                        </p>
                      )}
                      {generarTipo === 'PRIMARIA' && (
                        <p className="text-muted-foreground">
                          2 ciclos (Primer Ciclo, Segundo Ciclo) con 6 niveles:
                          1ro a 6to de Primaria
                        </p>
                      )}
                      {generarTipo === 'SECUNDARIA' && (
                        <p className="text-muted-foreground">
                          2 ciclos (Primer Ciclo, Segundo Ciclo) con 6 niveles:
                          1ro a 6to de Secundaria
                        </p>
                      )}
                      {generarTipo === 'POLITECNICO' && (
                        <p className="text-muted-foreground">
                          2 ciclos (Primer Ciclo, Segundo Ciclo) con 6 niveles:
                          1ro a 6to Politecnico (con modulos tecnicos)
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={closeGenerarModal}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={!generarTipo || isGenerando}
                      onClick={handleGenerarEstructura}
                    >
                      {isGenerando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function NivelCard({
  nivel,
  ciclosEducativos,
  onEdit,
  onDelete,
  onCicloChange,
}: {
  nivel: Nivel;
  ciclosEducativos: CicloEducativo[];
  onEdit: (nivel: Nivel) => void;
  onDelete: (id: string) => void;
  onCicloChange: (nivelId: string, cicloEducativoId: string) => void;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
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
          <div className="flex items-center gap-2">
            <select
              value={nivel.cicloEducativo?.id || ''}
              onChange={(e) => onCicloChange(nivel.id, e.target.value)}
              className="text-sm px-2 py-1 border rounded-md min-w-32"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Sin ciclo</option>
              {ciclosEducativos.map((ciclo) => (
                <option key={ciclo.id} value={ciclo.id}>
                  {ciclo.nombre}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(nivel)}
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(nivel.id)}
              title="Eliminar"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
