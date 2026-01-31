'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tareasApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  ClipboardList,
  Loader2,
  Plus,
  Calendar,
  Users,
  FileText,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  fechaVencimiento: string;
  puntajeMaximo: number | null;
  estado: 'BORRADOR' | 'PUBLICADA' | 'CERRADA';
  clase: {
    id: string;
    materia: { nombre: string };
    nivel: { nombre: string };
  };
  _count?: { entregas: number };
  createdAt: string;
}

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { nombre: string };
}

const estadoColors = {
  BORRADOR: 'bg-gray-100 text-gray-800',
  PUBLICADA: 'bg-green-100 text-green-800',
  CERRADA: 'bg-red-100 text-red-800',
};

const estadoLabels = {
  BORRADOR: 'Borrador',
  PUBLICADA: 'Publicada',
  CERRADA: 'Cerrada',
};

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function TareasDocentePage() {
  const { user } = useAuthStore();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClase, setSelectedClase] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTareas = async () => {
    try {
      const response = await tareasApi.getAll(
        selectedClase !== 'all' ? selectedClase : undefined
      );
      setTareas(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tareasRes, clasesRes] = await Promise.all([
          tareasApi.getAll(),
          clasesApi.getAll(),
        ]);
        setTareas(tareasRes.data || []);
        setClases(clasesRes.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchTareas();
    }
  }, [selectedClase]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await tareasApi.delete(deleteId);
      setTareas((prev) => prev.filter((t) => t.id !== deleteId));
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error:', apiError.response?.data?.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona las tareas de tus clases</p>
        </div>
        <Link href="/dashboard/tareas/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={selectedClase} onValueChange={setSelectedClase}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por clase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las clases</SelectItem>
            {clases.map((clase) => (
              <SelectItem key={clase.id} value={clase.id}>
                {clase.materia.nombre} - {clase.nivel.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tareas.length > 0 ? (
        <div className="grid gap-4">
          {tareas.map((tarea) => (
            <Card key={tarea.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{tarea.titulo}</h3>
                      <Badge className={estadoColors[tarea.estado]}>
                        {estadoLabels[tarea.estado]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {tarea.descripcion}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {tarea.clase.materia.nombre} - {tarea.clase.nivel.nombre}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Vence: {format(new Date(tarea.fechaVencimiento), 'PPP', { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {tarea._count?.entregas || 0} entregas
                      </span>
                      {tarea.puntajeMaximo && (
                        <span>Puntaje: {tarea.puntajeMaximo} pts</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link href={`/dashboard/tareas/${tarea.id}`}>
                      <Button variant="outline" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/tareas/${tarea.id}/editar`}>
                      <Button variant="outline" size="icon">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteId(tarea.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin tareas</h3>
            <p className="text-muted-foreground mb-4">
              No has creado ninguna tarea aún
            </p>
            <Link href="/dashboard/tareas/nueva">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Crear primera tarea
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las entregas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
