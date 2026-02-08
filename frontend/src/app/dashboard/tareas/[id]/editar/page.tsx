'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { tareasApi, uploadApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Link2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  instrucciones?: string;
  fechaVencimiento: string;
  puntajeMaximo?: number;
  estado: 'BORRADOR' | 'PUBLICADA' | 'CERRADA';
  clase: {
    id: string;
    materia: { nombre: string };
    nivel: { nombre: string };
  };
  recursos: { id: string; tipo: string; titulo: string; url: string }[];
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

function formatDateForInput(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditarTareaPage() {
  const router = useRouter();
  const params = useParams();
  const tareaId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingRecurso, setIsAddingRecurso] = useState(false);
  const [error, setError] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitulo, setLinkTitulo] = useState('');
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    instrucciones: '',
    fechaVencimiento: '',
    puntajeMaximo: '',
    estado: '',
  });

  useEffect(() => {
    const fetchTarea = async () => {
      try {
        const response = await tareasApi.getById(tareaId);
        const data: Tarea = response.data;
        setTarea(data);
        setFormData({
          titulo: data.titulo,
          descripcion: data.descripcion,
          instrucciones: data.instrucciones || '',
          fechaVencimiento: formatDateForInput(data.fechaVencimiento),
          puntajeMaximo: data.puntajeMaximo?.toString() || '',
          estado: data.estado,
        });
      } catch (error) {
        console.error('Error:', error);
        setError('No se pudo cargar la tarea');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTarea();
  }, [tareaId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploadRes = await uploadApi.uploadFile(file);
      const { url, nombre, tipo } = uploadRes.data;
      await tareasApi.agregarRecurso(tareaId, { tipo, titulo: nombre, url });
      const tareaRes = await tareasApi.getById(tareaId);
      setTarea(tareaRes.data);
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

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;

    setIsAddingRecurso(true);
    try {
      const titulo = linkTitulo.trim() || linkUrl;
      const tipo = isYouTubeUrl(linkUrl) ? 'VIDEO' : 'ENLACE';
      await tareasApi.agregarRecurso(tareaId, { tipo, titulo, url: linkUrl.trim() });
      const tareaRes = await tareasApi.getById(tareaId);
      setTarea(tareaRes.data);
      setLinkUrl('');
      setLinkTitulo('');
    } catch (error) {
      console.error('Error adding link:', error);
    } finally {
      setIsAddingRecurso(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.titulo.trim()) {
      setError('El titulo es requerido');
      return;
    }

    if (!formData.fechaVencimiento) {
      setError('La fecha de vencimiento es requerida');
      return;
    }

    setIsSubmitting(true);
    try {
      await tareasApi.update(tareaId, {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        instrucciones: formData.instrucciones || undefined,
        fechaVencimiento: new Date(formData.fechaVencimiento).toISOString(),
        puntajeMaximo: formData.puntajeMaximo
          ? parseFloat(formData.puntajeMaximo)
          : undefined,
        estado: formData.estado,
      });

      router.push(`/dashboard/tareas/${tareaId}`);
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al actualizar la tarea');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/tareas/${tareaId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Tarea</h1>
          <p className="text-muted-foreground">
            {tarea.clase.materia.nombre} - {tarea.clase.nivel.nombre}
          </p>
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
                <Label>Clase</Label>
                <Input
                  value={`${tarea.clase.materia.nombre} - ${tarea.clase.nivel.nombre}`}
                  disabled
                />
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
                    <SelectItem value="CERRADA">Cerrada</SelectItem>
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

            {/* Materiales de Apoyo existentes */}
            <div className="space-y-4">
              <Label>Materiales de Apoyo</Label>

              {tarea.recursos.length > 0 && (
                <div className="space-y-2 border rounded-lg p-3">
                  {tarea.recursos.map((recurso) => (
                    <a
                      key={recurso.id}
                      href={recurso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-muted rounded hover:bg-muted/80"
                    >
                      {recursoIcons[recurso.tipo] || <FileText className="w-4 h-4" />}
                      <span className="text-sm flex-1 truncate">{recurso.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        ({recurso.tipo})
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}

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
                  disabled={!linkUrl.trim() || isAddingRecurso}
                >
                  {isAddingRecurso ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Agregar'
                  )}
                </Button>
              </div>
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
              <Link href={`/dashboard/tareas/${tareaId}`}>
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
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
