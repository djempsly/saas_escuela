'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminApi, institucionesApi } from '@/lib/api';
import {
  UserCog,
  Plus,
  RefreshCcw,
  Copy,
  Check,
  Building2,
  History,
  X,
} from 'lucide-react';

interface Director {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  activo: boolean;
  institucionId: string | null;
  directorDe: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
  createdAt: string;
}

interface Institucion {
  id: string;
  nombre: string;
  directorId: string;
}

interface HistorialEntry {
  id: string;
  fechaInicio: string;
  fechaFin: string | null;
  motivo: string | null;
  director: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export default function AdminDirectoresPage() {
  const [directores, setDirectores] = useState<Director[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Modales
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    tempPassword: string | null;
    isSubmitting: boolean;
  }>({ isOpen: false, tempPassword: null, isSubmitting: false });

  const [reassignModal, setReassignModal] = useState<{
    isOpen: boolean;
    director: Director | null;
    isSubmitting: boolean;
  }>({ isOpen: false, director: null, isSubmitting: false });

  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean;
    institucionId: string;
    institucionNombre: string;
    historial: HistorialEntry[];
    isLoading: boolean;
  }>({ isOpen: false, institucionId: '', institucionNombre: '', historial: [], isLoading: false });

  // Formularios
  const [createForm, setCreateForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    institucionId: '',
  });

  const [reassignForm, setReassignForm] = useState({
    newInstitucionId: '',
    motivo: '',
  });

  const fetchDirectores = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getAllDirectores();
      setDirectores(response.data.data || []);
    } catch (error) {
      console.error('Error fetching directores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstituciones = async () => {
    try {
      const response = await institucionesApi.getAll();
      setInstituciones(response.data || []);
    } catch (error) {
      console.error('Error fetching instituciones:', error);
    }
  };

  useEffect(() => {
    fetchDirectores();
    fetchInstituciones();
  }, []);

  const handleCreateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const response = await adminApi.createDirector({
        nombre: createForm.nombre,
        apellido: createForm.apellido,
        email: createForm.email,
        institucionId: createForm.institucionId || undefined,
      });

      setCreateModal({
        isOpen: true,
        tempPassword: response.data.data.tempPassword,
        isSubmitting: false,
      });

      // Refresh list
      fetchDirectores();
      fetchInstituciones();
    } catch (error: unknown) {
      console.error('Error creating director:', error);
      const axiosErr = error as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || (error instanceof Error ? error.message : 'Error al crear director'));
      setCreateModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleReassignDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal.director) return;

    setReassignModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      await adminApi.reassignDirector(reassignModal.director.id, {
        newInstitucionId: reassignForm.newInstitucionId,
        motivo: reassignForm.motivo || undefined,
      });

      alert('Director reasignado correctamente');
      setReassignModal({ isOpen: false, director: null, isSubmitting: false });
      setReassignForm({ newInstitucionId: '', motivo: '' });

      // Refresh
      fetchDirectores();
      fetchInstituciones();
    } catch (error: unknown) {
      console.error('Error reassigning director:', error);
      const axiosErr = error as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || (error instanceof Error ? error.message : 'Error al reasignar director'));
      setReassignModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleViewHistory = async (institucionId: string, institucionNombre: string) => {
    setHistoryModal({
      isOpen: true,
      institucionId,
      institucionNombre,
      historial: [],
      isLoading: true,
    });

    try {
      const response = await adminApi.getDirectorHistory(institucionId);
      setHistoryModal((prev) => ({
        ...prev,
        historial: response.data.data || [],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeCreateModal = () => {
    setCreateModal({ isOpen: false, tempPassword: null, isSubmitting: false });
    setCreateForm({ nombre: '', apellido: '', email: '', institucionId: '' });
  };

  const institucionesSinDirector = instituciones.filter(
    (inst) => !directores.some((d) => d.directorDe?.id === inst.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion de Directores</h1>
          <p className="text-muted-foreground">
            Crea, reasigna y gestiona directores de instituciones
          </p>
        </div>
        <Button onClick={() => setCreateModal({ isOpen: true, tempPassword: null, isSubmitting: false })}>
          <Plus className="w-4 h-4 mr-2" />
          Crear Director
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Directores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directores.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Directores Asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {directores.filter((d) => d.directorDe).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Instituciones sin Director
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {institucionesSinDirector.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directors List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Lista de Directores
              </CardTitle>
              <CardDescription>
                {directores.length} directores registrados
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchDirectores}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : directores.length > 0 ? (
            <div className="space-y-3">
              {directores.map((director) => (
                <div
                  key={director.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserCog className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {director.nombre} {director.apellido}
                      </p>
                      <p className="text-sm text-muted-foreground">{director.email}</p>
                      <p className="text-xs text-muted-foreground">@{director.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {director.directorDe ? (
                      <div className="text-right">
                        <p className="text-sm font-medium">{director.directorDe.nombre}</p>
                        <p className="text-xs text-muted-foreground">/{director.directorDe.slug}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-orange-600">Sin institucion asignada</span>
                    )}
                    <div className="flex gap-2">
                      {director.directorDe && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleViewHistory(director.directorDe!.id, director.directorDe!.nombre)
                          }
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReassignModal({ isOpen: true, director, isSubmitting: false });
                          setReassignForm({ newInstitucionId: '', motivo: '' });
                        }}
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        Reasignar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserCog className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hay directores registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Director Modal */}
      {createModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {createModal.tempPassword ? 'Director Creado' : 'Crear Nuevo Director'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={closeCreateModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {createModal.tempPassword ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700 mb-2">Contraseña temporal:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white rounded border font-mono text-sm">
                        {createModal.tempPassword}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(createModal.tempPassword!)}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guarda esta contraseña. El director debera cambiarla en su primer inicio de sesion.
                  </p>
                  <Button className="w-full" onClick={closeCreateModal}>
                    Cerrar
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreateDirector} className="space-y-4">
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={createForm.nombre}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, nombre: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input
                        id="apellido"
                        value={createForm.apellido}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, apellido: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institucion">Institucion (opcional)</Label>
                    <select
                      id="institucion"
                      value={createForm.institucionId}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, institucionId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Sin asignar</option>
                      {institucionesSinDirector.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Solo se muestran instituciones sin director asignado
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeCreateModal}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createModal.isSubmitting}>
                      {createModal.isSubmitting ? 'Creando...' : 'Crear Director'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reassign Director Modal */}
      {reassignModal.isOpen && reassignModal.director && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reasignar Director</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReassignModal({ isOpen: false, director: null, isSubmitting: false })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Reasignar a {reassignModal.director.nombre} {reassignModal.director.apellido}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReassignDirector} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nueva Institucion *</Label>
                  <select
                    value={reassignForm.newInstitucionId}
                    onChange={(e) =>
                      setReassignForm({ ...reassignForm, newInstitucionId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">Seleccionar institucion</option>
                    {instituciones
                      .filter((inst) => inst.id !== reassignModal.director?.directorDe?.id)
                      .map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={reassignForm.motivo}
                    onChange={(e) =>
                      setReassignForm({ ...reassignForm, motivo: e.target.value })
                    }
                    placeholder="Ej: Reestructuracion organizacional"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      setReassignModal({ isOpen: false, director: null, isSubmitting: false })
                    }
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={reassignModal.isSubmitting}>
                    {reassignModal.isSubmitting ? 'Reasignando...' : 'Reasignar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Modal */}
      {historyModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Historial de Directores
                  </CardTitle>
                  <CardDescription>{historyModal.institucionNombre}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setHistoryModal({
                      isOpen: false,
                      institucionId: '',
                      institucionNombre: '',
                      historial: [],
                      isLoading: false,
                    })
                  }
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyModal.isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Cargando...</div>
              ) : historyModal.historial.length > 0 ? (
                <div className="space-y-3">
                  {historyModal.historial.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border ${
                        index === 0 && !entry.fechaFin ? 'bg-green-50 border-green-200' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {entry.director.nombre} {entry.director.apellido}
                          </p>
                          <p className="text-sm text-muted-foreground">{entry.director.email}</p>
                        </div>
                        {index === 0 && !entry.fechaFin && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Actual
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>
                          Inicio: {new Date(entry.fechaInicio).toLocaleDateString('es-ES')}
                        </p>
                        {entry.fechaFin && (
                          <p>Fin: {new Date(entry.fechaFin).toLocaleDateString('es-ES')}</p>
                        )}
                        {entry.motivo && <p className="mt-1">Motivo: {entry.motivo}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay historial disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
