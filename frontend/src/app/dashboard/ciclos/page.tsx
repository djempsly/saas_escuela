'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ciclosApi } from '@/lib/api';
import { Calendar, Plus, Loader2, CheckCircle, Circle, Power } from 'lucide-react';
import { toast } from 'sonner';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface CicloLectivo {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export default function CiclosPage() {
  const [ciclos, setCiclos] = useState<CicloLectivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newCiclo, setNewCiclo] = useState({
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    activo: false,
  });

  const fetchCiclos = async () => {
    try {
      const response = await ciclosApi.getAll();
      setCiclos(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCiclos();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setIsUpdating(id);
    try {
      await ciclosApi.update(id, { activo: !currentStatus });
      toast.success(currentStatus ? 'Ciclo desactivado' : 'Ciclo activado');
      fetchCiclos();
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.response?.data?.message || 'Error al actualizar estado');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await ciclosApi.create(newCiclo);
      setCiclos([response.data, ...ciclos]);
      setShowModal(false);
      setNewCiclo({ nombre: '', fechaInicio: '', fechaFin: '', activo: false });
      toast.success('Ciclo creado exitosamente');
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.response?.data?.message || 'Error al crear ciclo');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Ciclos Lectivos</h1>
          <p className="text-muted-foreground">Gestiona los períodos académicos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Ciclo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : ciclos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ciclos.map((ciclo) => (
            <Card key={ciclo.id} className={ciclo.activo ? 'border-primary border-2' : ''}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                  {ciclo.activo ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                      <CheckCircle className="w-4 h-4" /> Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Circle className="w-4 h-4" /> Inactivo
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-lg">{ciclo.nombre}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatDate(ciclo.fechaInicio)} - {formatDate(ciclo.fechaFin)}
                </p>
                <div className="mt-6 pt-4 border-t flex justify-end">
                  <Button
                    variant={ciclo.activo ? "destructive" : "default"}
                    size="sm"
                    onClick={() => handleToggleStatus(ciclo.id, ciclo.activo)}
                    disabled={isUpdating !== null}
                    className="w-full"
                  >
                    {isUpdating === ciclo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Power className="w-4 h-4 mr-2" />
                    )}
                    {ciclo.activo ? 'Desactivar Ciclo' : 'Activar Ciclo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay ciclos lectivos registrados</p>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Nuevo Ciclo Lectivo</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={newCiclo.nombre}
                    onChange={(e) => setNewCiclo({ ...newCiclo, nombre: e.target.value })}
                    placeholder="Ej: 2024-2025"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio *</Label>
                    <Input
                      type="date"
                      value={newCiclo.fechaInicio}
                      onChange={(e) => setNewCiclo({ ...newCiclo, fechaInicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin *</Label>
                    <Input
                      type="date"
                      value={newCiclo.fechaFin}
                      onChange={(e) => setNewCiclo({ ...newCiclo, fechaFin: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newCiclo.activo}
                    onChange={(e) => setNewCiclo({ ...newCiclo, activo: e.target.checked })}
                  />
                  Marcar como activo
                </label>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">Crear</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
