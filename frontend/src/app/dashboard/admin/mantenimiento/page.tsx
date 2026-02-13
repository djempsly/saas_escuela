'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { mantenimientoApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Loader2, Plus, Wrench, Calendar, Trash2 } from 'lucide-react';

interface AvisoMantenimiento {
  id: string;
  titulo: string;
  mensaje: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  createdAt: string;
  creadoPor: { id: string; nombre: string; apellido: string };
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEstado(aviso: AvisoMantenimiento) {
  const now = Date.now();
  const inicio = new Date(aviso.fechaInicio).getTime();
  const fin = new Date(aviso.fechaFin).getTime();
  if (now >= inicio && now <= fin) return { label: 'En curso', variant: 'destructive' as const };
  if (now < inicio) return { label: 'Programado', variant: 'default' as const };
  return { label: 'Finalizado', variant: 'secondary' as const };
}

export default function AdminMantenimientoPage() {
  const queryClient = useQueryClient();
  const [showCrearDialog, setShowCrearDialog] = useState(false);
  const [cancelarId, setCancelarId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: '',
    mensaje: '',
    fechaInicio: '',
    fechaFin: '',
  });

  const { data: avisos = [], isLoading } = useQuery<AvisoMantenimiento[]>({
    queryKey: queryKeys.mantenimiento.list(),
    queryFn: async () => {
      const res = await mantenimientoApi.getAll();
      return res.data?.data || res.data || [];
    },
  });

  const crearMutation = useMutation({
    mutationFn: (data: { titulo: string; mensaje: string; fechaInicio: string; fechaFin: string }) =>
      mantenimientoApi.crear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimiento'] });
      setShowCrearDialog(false);
      setForm({ titulo: '', mensaje: '', fechaInicio: '', fechaFin: '' });
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: (id: string) => mantenimientoApi.cancelar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimiento'] });
      setCancelarId(null);
    },
  });

  const handleCrear = () => {
    if (!form.titulo || !form.mensaje || !form.fechaInicio || !form.fechaFin) return;
    crearMutation.mutate({
      titulo: form.titulo,
      mensaje: form.mensaje,
      fechaInicio: new Date(form.fechaInicio).toISOString(),
      fechaFin: new Date(form.fechaFin).toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avisos de Mantenimiento</h1>
          <p className="text-muted-foreground">Programa avisos de mantenimiento para la plataforma</p>
        </div>
        <Button onClick={() => setShowCrearDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Aviso
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : avisos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay avisos de mantenimiento activos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {avisos.map((aviso) => {
            const estado = getEstado(aviso);
            return (
              <Card key={aviso.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{aviso.titulo}</h3>
                          <Badge variant={estado.variant}>{estado.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{aviso.mensaje}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatFecha(aviso.fechaInicio)} — {formatFecha(aviso.fechaFin)}
                          </span>
                          <span>
                            Por: {aviso.creadoPor.nombre} {aviso.creadoPor.apellido}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 flex-shrink-0 ml-3"
                      onClick={() => setCancelarId(aviso.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCrearDialog} onOpenChange={setShowCrearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Aviso de Mantenimiento</DialogTitle>
            <DialogDescription>
              Los directores seran notificados al crear el aviso y recibiran recordatorios 48h y 24h antes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Titulo</label>
              <Input
                placeholder="Ej: Actualizacion del sistema"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Mensaje</label>
              <Textarea
                placeholder="Descripcion del mantenimiento..."
                value={form.mensaje}
                onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha Inicio</label>
                <Input
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Fecha Fin</label>
                <Input
                  type="datetime-local"
                  value={form.fechaFin}
                  onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCrearDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCrear}
              disabled={!form.titulo || !form.mensaje || !form.fechaInicio || !form.fechaFin || crearMutation.isPending}
            >
              {crearMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <AlertDialog open={!!cancelarId} onOpenChange={(open) => !open && setCancelarId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar aviso de mantenimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion desactivara el aviso. Los usuarios ya no veran la notificacion de mantenimiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelarId && cancelarMutation.mutate(cancelarId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelarMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar cancelacion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
