'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { tareasApi, clasesApi } from '@/lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { nombre: string };
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function NuevaTareaPage() {
  const router = useRouter();
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    instrucciones: '',
    fechaVencimiento: '',
    puntajeMaximo: '',
    estado: 'BORRADOR',
    claseId: '',
  });

  useEffect(() => {
    const fetchClases = async () => {
      try {
        const response = await clasesApi.getAll();
        setClases(response.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClases();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.claseId) {
      setError('Debes seleccionar una clase');
      return;
    }

    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }

    if (!formData.fechaVencimiento) {
      setError('La fecha de vencimiento es requerida');
      return;
    }

    setIsSubmitting(true);
    try {
      await tareasApi.create({
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        instrucciones: formData.instrucciones || undefined,
        fechaVencimiento: new Date(formData.fechaVencimiento).toISOString(),
        puntajeMaximo: formData.puntajeMaximo
          ? parseFloat(formData.puntajeMaximo)
          : undefined,
        estado: formData.estado,
        claseId: formData.claseId,
      });
      router.push('/dashboard/tareas');
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al crear la tarea');
    } finally {
      setIsSubmitting(false);
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tareas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nueva Tarea</h1>
          <p className="text-muted-foreground">Crea una nueva tarea para tus estudiantes</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="claseId">Clase *</Label>
                <Select
                  value={formData.claseId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, claseId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una clase" />
                  </SelectTrigger>
                  <SelectContent>
                    {clases.map((clase) => (
                      <SelectItem key={clase.id} value={clase.id}>
                        {clase.materia.nombre} - {clase.nivel.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) =>
                    setFormData({ ...formData, estado: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BORRADOR">Borrador</SelectItem>
                    <SelectItem value="PUBLICADA">Publicada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                placeholder="Ej: Ensayo sobre la Revolución Industrial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Describe brevemente de qué trata la tarea..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrucciones">Instrucciones (opcional)</Label>
              <Textarea
                id="instrucciones"
                value={formData.instrucciones}
                onChange={(e) =>
                  setFormData({ ...formData, instrucciones: e.target.value })
                }
                placeholder="Instrucciones detalladas para completar la tarea..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento *</Label>
                <Input
                  id="fechaVencimiento"
                  type="datetime-local"
                  value={formData.fechaVencimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, fechaVencimiento: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="puntajeMaximo">Puntaje máximo (opcional)</Label>
                <Input
                  id="puntajeMaximo"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.puntajeMaximo}
                  onChange={(e) =>
                    setFormData({ ...formData, puntajeMaximo: e.target.value })
                  }
                  placeholder="Ej: 100"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t">
              <Link href="/dashboard/tareas">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Crear Tarea'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
