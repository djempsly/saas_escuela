'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { coordinadoresApi, nivelesApi, ciclosEducativosApi } from '@/lib/api';
import {
  Users,
  Loader2,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  Save,
  User,
} from 'lucide-react';

interface Coordinador {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  role: string;
  activo: boolean;
  coordinadorDe: { id: string; nombre: string }[];
  coordinadorCiclosEducativos: { id: string; nombre: string }[];
}

interface Nivel {
  id: string;
  nombre: string;
}

interface CicloEducativo {
  id: string;
  nombre: string;
}

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

export default function CoordinadoresPage() {
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ciclos, setCiclos] = useState<CicloEducativo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCoords, setExpandedCoords] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState<'niveles' | 'ciclos' | null>(null);
  const [selectedCoord, setSelectedCoord] = useState<Coordinador | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coordsRes, nivelesRes, ciclosRes] = await Promise.all([
        coordinadoresApi.getAll(),
        nivelesApi.getAll(),
        ciclosEducativosApi.getAll(),
      ]);
      setCoordinadores(coordsRes.data?.data || []);
      setNiveles(nivelesRes.data || []);
      setCiclos(ciclosRes.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCoords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCoords(newExpanded);
  };

  const openAssignModal = (coord: Coordinador, type: 'niveles' | 'ciclos') => {
    setSelectedCoord(coord);
    if (type === 'niveles') {
      setSelectedItems(coord.coordinadorDe.map((n) => n.id));
    } else {
      setSelectedItems(coord.coordinadorCiclosEducativos.map((c) => c.id));
    }
    setShowAssignModal(type);
  };

  const handleAssign = async () => {
    if (!selectedCoord) return;
    setIsSaving(true);

    try {
      if (showAssignModal === 'niveles') {
        await coordinadoresApi.assignNiveles(selectedCoord.id, selectedItems);
      } else {
        await coordinadoresApi.assignCiclos(selectedCoord.id, selectedItems);
      }
      await fetchData();
      setShowAssignModal(null);
      setSelectedCoord(null);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al asignar');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      COORDINADOR: 'bg-blue-100 text-blue-700',
      COORDINADOR_ACADEMICO: 'bg-purple-100 text-purple-700',
    };
    return colors[role] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coordinadores</h1>
        <p className="text-muted-foreground">
          Gestiona los coordinadores y sus asignaciones a niveles y ciclos educativos
        </p>
      </div>

      {/* Lista de Coordinadores */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : coordinadores.length > 0 ? (
        <div className="space-y-3">
          {coordinadores.map((coord) => (
            <Card key={coord.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleExpand(coord.id)}
                    className="mt-1 p-1 hover:bg-slate-100 rounded"
                  >
                    {expandedCoords.has(coord.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {coord.nombre} {coord.apellido}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded ${getRoleBadge(coord.role)}`}>
                        {coord.role.replace('_', ' ')}
                      </span>
                      {!coord.activo && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {coord.email && (
                      <p className="text-sm text-muted-foreground">{coord.email}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{coord.coordinadorDe.length} niveles</span>
                      <span>{coord.coordinadorCiclosEducativos.length} ciclos</span>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignModal(coord, 'niveles')}
                    >
                      <Layers className="w-4 h-4 mr-1" />
                      Niveles
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAssignModal(coord, 'ciclos')}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Ciclos
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedCoords.has(coord.id) && (
                  <div className="mt-4 ml-14 grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Niveles Coordinados</h4>
                      {coord.coordinadorDe.length > 0 ? (
                        <div className="space-y-1">
                          {coord.coordinadorDe.map((n) => (
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
                      <h4 className="text-sm font-medium mb-2">Ciclos Educativos Coordinados</h4>
                      {coord.coordinadorCiclosEducativos.length > 0 ? (
                        <div className="space-y-1">
                          {coord.coordinadorCiclosEducativos.map((c) => (
                            <div key={c.id} className="text-sm p-2 bg-slate-50 rounded">
                              {c.nombre}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin ciclos asignados</p>
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
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay coordinadores</h3>
            <p className="text-muted-foreground">
              Crea usuarios con rol Coordinador o Coordinador Academico
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal Asignar */}
      {showAssignModal && selectedCoord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Asignar {showAssignModal === 'niveles' ? 'Niveles' : 'Ciclos Educativos'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setShowAssignModal(null); setSelectedCoord(null); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Selecciona {showAssignModal === 'niveles' ? 'los niveles' : 'los ciclos'} para{' '}
                <strong>{selectedCoord.nombre} {selectedCoord.apellido}</strong>
              </p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {showAssignModal === 'niveles' ? (
                  niveles.length > 0 ? (
                    niveles.map((nivel) => (
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
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay niveles disponibles
                    </p>
                  )
                ) : (
                  ciclos.length > 0 ? (
                    ciclos.map((ciclo) => (
                      <label
                        key={ciclo.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(ciclo.id)}
                          onChange={() => toggleItem(ciclo.id)}
                          className="w-4 h-4"
                        />
                        <span>{ciclo.nombre}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay ciclos educativos disponibles
                    </p>
                  )
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowAssignModal(null); setSelectedCoord(null); }}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleAssign} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
