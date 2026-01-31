'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { tareasApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl?: string;
}

interface Archivo {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
}

interface Entrega {
  id: string;
  contenido?: string;
  comentarioEstudiante?: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CALIFICADO' | 'ATRASADO';
  fechaEntrega?: string;
  calificacion?: number;
  comentarioDocente?: string;
  estudiante: Estudiante;
  archivos: Archivo[];
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  instrucciones?: string;
  fechaVencimiento: string;
  fechaPublicacion?: string;
  puntajeMaximo?: number;
  estado: 'BORRADOR' | 'PUBLICADA' | 'CERRADA';
  clase: {
    id: string;
    materia: { nombre: string };
    nivel: { nombre: string };
  };
  docente: { nombre: string; apellido: string };
  recursos: { id: string; tipo: string; titulo: string; url: string }[];
  entregas: Entrega[];
}

interface EntregaConEstudiante {
  estudiante: Estudiante;
  entrega: Entrega | null;
}

const estadoEntregaColors = {
  PENDIENTE: 'bg-gray-100 text-gray-800',
  ENTREGADO: 'bg-blue-100 text-blue-800',
  CALIFICADO: 'bg-green-100 text-green-800',
  ATRASADO: 'bg-red-100 text-red-800',
};

const estadoEntregaLabels = {
  PENDIENTE: 'Pendiente',
  ENTREGADO: 'Entregado',
  CALIFICADO: 'Calificado',
  ATRASADO: 'Atrasado',
};

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function TareaDetallePage() {
  const params = useParams();
  const tareaId = params.id as string;

  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [entregas, setEntregas] = useState<EntregaConEstudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaConEstudiante | null>(null);
  const [calificacion, setCalificacion] = useState('');
  const [comentario, setComentario] = useState('');
  const [isCalificando, setIsCalificando] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tareaRes, entregasRes] = await Promise.all([
          tareasApi.getById(tareaId),
          tareasApi.getEntregas(tareaId),
        ]);
        setTarea(tareaRes.data);
        setEntregas(entregasRes.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [tareaId]);

  const handleCalificar = async () => {
    if (!selectedEntrega?.entrega || !calificacion) return;

    setIsCalificando(true);
    try {
      await tareasApi.calificar(tareaId, selectedEntrega.entrega.id, {
        calificacion: parseFloat(calificacion),
        comentarioDocente: comentario || undefined,
      });

      // Actualizar entregas
      const entregasRes = await tareasApi.getEntregas(tareaId);
      setEntregas(entregasRes.data || []);
      setSelectedEntrega(null);
      setCalificacion('');
      setComentario('');
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error:', apiError.response?.data?.message);
    } finally {
      setIsCalificando(false);
    }
  };

  const openCalificarDialog = (entrega: EntregaConEstudiante) => {
    setSelectedEntrega(entrega);
    if (entrega.entrega?.calificacion) {
      setCalificacion(entrega.entrega.calificacion.toString());
      setComentario(entrega.entrega.comentarioDocente || '');
    } else {
      setCalificacion('');
      setComentario('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tarea) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tarea no encontrada</p>
        <Link href="/dashboard/tareas">
          <Button className="mt-4">Volver a tareas</Button>
        </Link>
      </div>
    );
  }

  const stats = {
    total: entregas.length,
    entregadas: entregas.filter((e) => e.entrega?.estado !== 'PENDIENTE').length,
    calificadas: entregas.filter((e) => e.entrega?.estado === 'CALIFICADO').length,
    pendientes: entregas.filter(
      (e) => !e.entrega || e.entrega.estado === 'PENDIENTE'
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tareas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{tarea.titulo}</h1>
          <p className="text-muted-foreground">
            {tarea.clase.materia.nombre} - {tarea.clase.nivel.nombre}
          </p>
        </div>
        <Link href={`/dashboard/tareas/${tarea.id}/editar`}>
          <Button variant="outline">Editar</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Estudiantes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.entregadas}</p>
                <p className="text-sm text-muted-foreground">Entregadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.calificadas}</p>
                <p className="text-sm text-muted-foreground">Calificadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la tarea</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Descripción</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {tarea.descripcion}
            </p>
          </div>
          {tarea.instrucciones && (
            <div>
              <h4 className="font-medium mb-2">Instrucciones</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {tarea.instrucciones}
              </p>
            </div>
          )}
          <div className="flex gap-6 text-sm">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Vence: {format(new Date(tarea.fechaVencimiento), 'PPP p', { locale: es })}
            </span>
            {tarea.puntajeMaximo && (
              <span>Puntaje máximo: {tarea.puntajeMaximo} pts</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entregas de estudiantes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de entrega</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregas.map((item) => (
                <TableRow key={item.estudiante.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.estudiante.fotoUrl} />
                        <AvatarFallback>
                          {item.estudiante.nombre[0]}
                          {item.estudiante.apellido[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {item.estudiante.nombre} {item.estudiante.apellido}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        item.entrega
                          ? estadoEntregaColors[item.entrega.estado]
                          : estadoEntregaColors.PENDIENTE
                      }
                    >
                      {item.entrega
                        ? estadoEntregaLabels[item.entrega.estado]
                        : 'Sin entregar'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.entrega?.fechaEntrega
                      ? format(new Date(item.entrega.fechaEntrega), 'PPP p', {
                          locale: es,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {item.entrega?.calificacion !== undefined &&
                    item.entrega?.calificacion !== null
                      ? `${item.entrega.calificacion}${
                          tarea.puntajeMaximo ? `/${tarea.puntajeMaximo}` : ''
                        }`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.entrega && item.entrega.estado !== 'PENDIENTE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCalificarDialog(item)}
                      >
                        {item.entrega.calificacion !== undefined
                          ? 'Editar calificación'
                          : 'Calificar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedEntrega}
        onOpenChange={() => setSelectedEntrega(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Calificar entrega de {selectedEntrega?.estudiante.nombre}{' '}
              {selectedEntrega?.estudiante.apellido}
            </DialogTitle>
          </DialogHeader>

          {selectedEntrega?.entrega && (
            <div className="space-y-4">
              {selectedEntrega.entrega.contenido && (
                <div>
                  <Label>Contenido de la entrega</Label>
                  <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedEntrega.entrega.contenido}
                  </div>
                </div>
              )}

              {selectedEntrega.entrega.comentarioEstudiante && (
                <div>
                  <Label>Comentario del estudiante</Label>
                  <p className="mt-1 text-muted-foreground">
                    {selectedEntrega.entrega.comentarioEstudiante}
                  </p>
                </div>
              )}

              {selectedEntrega.entrega.archivos?.length > 0 && (
                <div>
                  <Label>Archivos adjuntos</Label>
                  <div className="mt-2 space-y-2">
                    {selectedEntrega.entrega.archivos.map((archivo) => (
                      <a
                        key={archivo.id}
                        href={archivo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-muted rounded hover:bg-muted/80"
                      >
                        <Download className="w-4 h-4" />
                        {archivo.nombre}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="calificacion">
                    Calificación{' '}
                    {tarea.puntajeMaximo && `(máx: ${tarea.puntajeMaximo})`}
                  </Label>
                  <Input
                    id="calificacion"
                    type="number"
                    min="0"
                    max={tarea.puntajeMaximo || undefined}
                    step="0.5"
                    value={calificacion}
                    onChange={(e) => setCalificacion(e.target.value)}
                    placeholder="Ej: 85"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comentario">Comentario (opcional)</Label>
                  <Textarea
                    id="comentario"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Retroalimentación para el estudiante..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedEntrega(null)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCalificar} disabled={isCalificando || !calificacion}>
              {isCalificando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar calificación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
