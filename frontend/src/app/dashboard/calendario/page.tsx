'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { eventosApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CalendarView } from '@/components/calendar/calendar-view';
import {
  Calendar,
  Loader2,
  Plus,
  Clock,
  MapPin,
  X,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
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
import { Switch } from '@/components/ui/switch';

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  ubicacion?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  todoElDia: boolean;
  color?: string;
  creador: { nombre: string; apellido: string };
  clase?: { materia: { nombre: string }; nivel: { nombre: string } };
}

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { nombre: string };
}

const tipoLabels: Record<string, string> = {
  ACADEMICO: 'Académico',
  CULTURAL: 'Cultural',
  DEPORTIVO: 'Deportivo',
  REUNION_PADRES: 'Reunión de Padres',
  FERIADO: 'Feriado',
  EVALUACION: 'Evaluación',
  OTRO: 'Otro',
};

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function CalendarioPage() {
  const { user } = useAuthStore();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [tiposEvento, setTiposEvento] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    ubicacion: '',
    tipo: 'ACADEMICO',
    fechaInicio: '',
    fechaFin: '',
    todoElDia: false,
    claseId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canCreate = ['DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO', 'DOCENTE'].includes(
    user?.role || ''
  );

  const fetchEventos = async () => {
    const fechaInicio = startOfMonth(new Date());
    const fechaFin = endOfMonth(addMonths(new Date(), 2));

    try {
      const response = await eventosApi.getAll({
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
      });
      setEventos(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tiposRes, clasesRes] = await Promise.all([
          eventosApi.getTipos(),
          canCreate ? clasesApi.getAll() : Promise.resolve({ data: [] }),
        ]);
        setTiposEvento(tiposRes.data || []);
        setClases(clasesRes.data || []);
        await fetchEventos();
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [canCreate]);

  const openCreateModal = (date?: Date) => {
    const now = date || new Date();
    const dateStr = format(now, "yyyy-MM-dd'T'HH:mm");
    setFormData({
      titulo: '',
      descripcion: '',
      ubicacion: '',
      tipo: 'ACADEMICO',
      fechaInicio: dateStr,
      fechaFin: dateStr,
      todoElDia: false,
      claseId: '',
    });
    setError('');
    setShowCreateModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await eventosApi.create({
        titulo: formData.titulo,
        descripcion: formData.descripcion || undefined,
        ubicacion: formData.ubicacion || undefined,
        tipo: formData.tipo,
        fechaInicio: new Date(formData.fechaInicio).toISOString(),
        fechaFin: new Date(formData.fechaFin).toISOString(),
        todoElDia: formData.todoElDia,
        claseId: formData.claseId || undefined,
      });
      setShowCreateModal(false);
      await fetchEventos();
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al crear evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventoId: string) => {
    try {
      await eventosApi.delete(eventoId);
      setSelectedEvento(null);
      await fetchEventos();
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error:', apiError.response?.data?.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">
            Eventos y actividades programadas
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreateModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Evento
          </Button>
        )}
      </div>

      <CalendarView
        eventos={eventos}
        onSelectDate={(date) => {
          setSelectedDate(date);
          if (canCreate) {
            openCreateModal(date);
          }
        }}
        onSelectEvent={(evento) => {
          const fullEvento = eventos.find(e => e.id === evento.id);
          if (fullEvento) setSelectedEvento(fullEvento);
        }}
      />

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvento} onOpenChange={() => setSelectedEvento(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvento?.titulo}</DialogTitle>
          </DialogHeader>

          {selectedEvento && (
            <div className="space-y-4">
              <Badge className="capitalize">
                {tipoLabels[selectedEvento.tipo] || selectedEvento.tipo}
              </Badge>

              {selectedEvento.descripcion && (
                <p className="text-muted-foreground">
                  {selectedEvento.descripcion}
                </p>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {format(
                      new Date(selectedEvento.fechaInicio),
                      selectedEvento.todoElDia ? 'PPP' : 'PPP p',
                      { locale: es }
                    )}
                    {!selectedEvento.todoElDia && (
                      <>
                        {' - '}
                        {format(new Date(selectedEvento.fechaFin), 'p', {
                          locale: es,
                        })}
                      </>
                    )}
                  </span>
                </div>

                {selectedEvento.ubicacion && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedEvento.ubicacion}</span>
                  </div>
                )}

                {selectedEvento.clase && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {selectedEvento.clase.materia.nombre} -{' '}
                      {selectedEvento.clase.nivel.nombre}
                    </span>
                  </div>
                )}

                <p className="text-muted-foreground pt-2">
                  Creado por: {selectedEvento.creador.nombre}{' '}
                  {selectedEvento.creador.apellido}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            {canCreate && (
              <Button
                variant="destructive"
                onClick={() => selectedEvento && handleDelete(selectedEvento.id)}
              >
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedEvento(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Evento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                placeholder="Ej: Reunión de padres"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de evento</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposEvento.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipoLabels[tipo] || tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Detalles del evento..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input
                id="ubicacion"
                value={formData.ubicacion}
                onChange={(e) =>
                  setFormData({ ...formData, ubicacion: e.target.value })
                }
                placeholder="Ej: Salón principal"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="todoElDia"
                checked={formData.todoElDia}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, todoElDia: checked })
                }
              />
              <Label htmlFor="todoElDia">Todo el día</Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha inicio</Label>
                <Input
                  id="fechaInicio"
                  type={formData.todoElDia ? 'date' : 'datetime-local'}
                  value={
                    formData.todoElDia
                      ? formData.fechaInicio.split('T')[0]
                      : formData.fechaInicio
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, fechaInicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha fin</Label>
                <Input
                  id="fechaFin"
                  type={formData.todoElDia ? 'date' : 'datetime-local'}
                  value={
                    formData.todoElDia
                      ? formData.fechaFin.split('T')[0]
                      : formData.fechaFin
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, fechaFin: e.target.value })
                  }
                />
              </div>
            </div>

            {clases.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="claseId">Asociar a clase (opcional)</Label>
                <Select
                  value={formData.claseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, claseId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Evento general" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Evento general</SelectItem>
                    {clases.map((clase) => (
                      <SelectItem key={clase.id} value={clase.id}>
                        {clase.materia.nombre} - {clase.nivel.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Crear Evento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
