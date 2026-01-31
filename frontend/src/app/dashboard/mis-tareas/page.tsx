'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tareasApi } from '@/lib/api';
import {
  ClipboardList,
  Loader2,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Entrega {
  id: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CALIFICADO' | 'ATRASADO';
  calificacion?: number;
  fechaEntrega?: string;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  fechaVencimiento: string;
  puntajeMaximo: number | null;
  clase: {
    id: string;
    materia: { nombre: string };
    nivel: { nombre: string };
  };
  docente: { nombre: string; apellido: string };
  entregas: Entrega[];
}

const estadoColors = {
  pendiente: 'bg-amber-100 text-amber-800',
  entregada: 'bg-blue-100 text-blue-800',
  calificada: 'bg-green-100 text-green-800',
  atrasada: 'bg-red-100 text-red-800',
  vencida: 'bg-gray-100 text-gray-800',
};

export default function MisTareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pendientes');

  useEffect(() => {
    const fetchTareas = async () => {
      try {
        const response = await tareasApi.getAll();
        setTareas(response.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTareas();
  }, []);

  const getEstadoTarea = (tarea: Tarea) => {
    const entrega = tarea.entregas?.[0];
    if (entrega?.estado === 'CALIFICADO') return 'calificada';
    if (entrega?.estado === 'ENTREGADO' || entrega?.estado === 'ATRASADO')
      return 'entregada';
    if (isPast(new Date(tarea.fechaVencimiento))) return 'vencida';
    return 'pendiente';
  };

  const tareasConEstado = tareas.map((tarea) => ({
    ...tarea,
    estadoCalculado: getEstadoTarea(tarea),
  }));

  const tareasPendientes = tareasConEstado.filter(
    (t) => t.estadoCalculado === 'pendiente' || t.estadoCalculado === 'vencida'
  );
  const tareasEntregadas = tareasConEstado.filter(
    (t) => t.estadoCalculado === 'entregada'
  );
  const tareasCalificadas = tareasConEstado.filter(
    (t) => t.estadoCalculado === 'calificada'
  );

  const getDiasRestantes = (fecha: string) => {
    const dias = differenceInDays(new Date(fecha), new Date());
    if (dias < 0) return 'Vencida';
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    return `${dias} días restantes`;
  };

  const renderTareaCard = (tarea: Tarea & { estadoCalculado: string }) => {
    const entrega = tarea.entregas?.[0];
    const esVencida = isPast(new Date(tarea.fechaVencimiento));

    return (
      <Card key={tarea.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg">{tarea.titulo}</h3>
                <Badge className={estadoColors[tarea.estadoCalculado as keyof typeof estadoColors]}>
                  {tarea.estadoCalculado === 'pendiente' && 'Pendiente'}
                  {tarea.estadoCalculado === 'entregada' && 'Entregada'}
                  {tarea.estadoCalculado === 'calificada' && (
                    <>
                      Calificada: {entrega?.calificacion}
                      {tarea.puntajeMaximo && `/${tarea.puntajeMaximo}`}
                    </>
                  )}
                  {tarea.estadoCalculado === 'vencida' && 'Vencida'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {tarea.descripcion}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {tarea.clase.materia.nombre}
                </span>
                <span className="flex items-center gap-1">
                  {esVencida ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                  {getDiasRestantes(tarea.fechaVencimiento)}
                </span>
                {tarea.puntajeMaximo && (
                  <span>Puntaje: {tarea.puntajeMaximo} pts</span>
                )}
              </div>
            </div>
            <Link href={`/dashboard/mis-tareas/${tarea.id}`}>
              <Button
                variant={
                  tarea.estadoCalculado === 'pendiente' ? 'default' : 'outline'
                }
              >
                {tarea.estadoCalculado === 'pendiente'
                  ? 'Entregar'
                  : tarea.estadoCalculado === 'calificada'
                  ? 'Ver calificación'
                  : 'Ver entrega'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
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
      <div>
        <h1 className="text-2xl font-bold">Mis Tareas</h1>
        <p className="text-muted-foreground">
          Revisa y entrega tus tareas asignadas
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tareasPendientes.length}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tareasEntregadas.length}</p>
                <p className="text-sm text-muted-foreground">Entregadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tareasCalificadas.length}</p>
                <p className="text-sm text-muted-foreground">Calificadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes ({tareasPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="entregadas">
            Entregadas ({tareasEntregadas.length})
          </TabsTrigger>
          <TabsTrigger value="calificadas">
            Calificadas ({tareasCalificadas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="space-y-4 mt-4">
          {tareasPendientes.length > 0 ? (
            tareasPendientes.map(renderTareaCard)
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  ¡Estás al día!
                </h3>
                <p className="text-muted-foreground">
                  No tienes tareas pendientes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="entregadas" className="space-y-4 mt-4">
          {tareasEntregadas.length > 0 ? (
            tareasEntregadas.map(renderTareaCard)
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tienes tareas entregadas pendientes de calificación
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calificadas" className="space-y-4 mt-4">
          {tareasCalificadas.length > 0 ? (
            tareasCalificadas.map(renderTareaCard)
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No tienes tareas calificadas aún
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
