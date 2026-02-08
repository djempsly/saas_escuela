'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { tareasApi, clasesApi, uploadApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
} from 'lucide-react';
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

interface Recurso {
  tipo: string;
  titulo: string;
  url: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed)/.test(url);
}

const recursoIcons: Record<string, React.ReactNode> = {
  ARCHIVO: <FileText className="w-4 h-4" />,
  IMAGEN: <ImageIcon className="w-4 h-4" />,
  VIDEO: <Video className="w-4 h-4" />,
  ENLACE: <Link2 className="w-4 h-4" />,
};

export default function NuevaTareaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitulo, setLinkTitulo] = useState('');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadApi.uploadFile(file);
      const { url, nombre, tipo } = response.data;
      setRecursos((prev) => [...prev, { tipo, titulo: nombre, url }]);
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al subir el archivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;

    const titulo = linkTitulo.trim() || linkUrl;
    const tipo = isYouTubeUrl(linkUrl) ? 'VIDEO' : 'ENLACE';
    setRecursos((prev) => [...prev, { tipo, titulo, url: linkUrl.trim() }]);
    setLinkUrl('');
    setLinkTitulo('');
  };

  const handleRemoveRecurso = (index: number) => {
    setRecursos((prev) => prev.filter((_, i) => i !== index));
  };

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
      const tareaRes = await tareasApi.create({
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

      const tareaId = tareaRes.data.id;

      // Agregar recursos
      await Promise.all(
        recursos.map((recurso) => tareasApi.agregarRecurso(tareaId, recurso))
      );

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
              <Label htmlFor="titulo">Titulo *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                placeholder="Ej: Ensayo sobre la Revolucion Industrial"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion *</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Describe brevemente de que trata la tarea..."
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

            {/* Materiales de Apoyo */}
            <div className="space-y-4">
              <Label>Materiales de Apoyo (opcional)</Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir archivo
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                />
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="linkUrl" className="text-xs text-muted-foreground">
                    URL (YouTube o enlace)
                  </Label>
                  <Input
                    id="linkUrl"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... o cualquier URL"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="linkTitulo" className="text-xs text-muted-foreground">
                    Titulo del enlace
                  </Label>
                  <Input
                    id="linkTitulo"
                    value={linkTitulo}
                    onChange={(e) => setLinkTitulo(e.target.value)}
                    placeholder="Nombre del recurso"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddLink}
                  disabled={!linkUrl.trim()}
                >
                  Agregar
                </Button>
              </div>

              {recursos.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  {recursos.map((recurso, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {recursoIcons[recurso.tipo] || <FileText className="w-4 h-4" />}
                        <span className="text-sm truncate">{recurso.titulo}</span>
                        <span className="text-xs text-muted-foreground">
                          ({recurso.tipo})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleRemoveRecurso(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                <Label htmlFor="puntajeMaximo">Puntaje maximo (opcional)</Label>
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
