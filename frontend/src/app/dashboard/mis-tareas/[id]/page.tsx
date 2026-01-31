'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { tareasApi, uploadApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';

interface Archivo {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
}

interface Recurso {
  id: string;
  tipo: string;
  titulo: string;
  url: string;
}

interface Entrega {
  id: string;
  contenido?: string;
  comentarioEstudiante?: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CALIFICADO' | 'ATRASADO';
  fechaEntrega?: string;
  calificacion?: number;
  comentarioDocente?: string;
  archivos: Archivo[];
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  instrucciones?: string;
  fechaVencimiento: string;
  puntajeMaximo?: number;
  clase: {
    id: string;
    materia: { nombre: string };
    nivel: { nombre: string };
  };
  docente: { nombre: string; apellido: string };
  recursos: Recurso[];
  entregas: Entrega[];
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function EntregarTareaPage() {
  const params = useParams();
  const router = useRouter();
  const tareaId = params.id as string;

  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [contenido, setContenido] = useState('');
  const [comentario, setComentario] = useState('');
  const [archivos, setArchivos] = useState<{ nombre: string; url: string; tipo: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchTarea = async () => {
      try {
        const response = await tareasApi.getById(tareaId);
        const tareaData = response.data;
        setTarea(tareaData);

        // Si ya hay entrega, cargar datos
        if (tareaData.entregas?.[0]) {
          const entrega = tareaData.entregas[0];
          setContenido(entrega.contenido || '');
          setComentario(entrega.comentarioEstudiante || '');
          setArchivos(
            entrega.archivos?.map((a: Archivo) => ({
              nombre: a.nombre,
              url: a.url,
              tipo: a.tipo,
            })) || []
          );
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTarea();
  }, [tareaId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const response = await uploadApi.uploadFile(file);
        setArchivos((prev) => [
          ...prev,
          {
            nombre: file.name,
            url: response.data.url,
            tipo: file.type,
          },
        ]);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const removeArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!contenido.trim() && archivos.length === 0) {
      setError('Debes agregar contenido o al menos un archivo');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await tareasApi.entregar(tareaId, {
        contenido: contenido.trim() || undefined,
        comentarioEstudiante: comentario.trim() || undefined,
        archivos: archivos.length > 0 ? archivos : undefined,
      });
      router.push('/dashboard/mis-tareas');
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al entregar tarea');
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
        <Link href="/dashboard/mis-tareas">
          <Button className="mt-4">Volver a mis tareas</Button>
        </Link>
      </div>
    );
  }

  const entrega = tarea.entregas?.[0];
  const esVencida = isPast(new Date(tarea.fechaVencimiento));
  const yaCalificada = entrega?.estado === 'CALIFICADO';
  const yaEntregada = entrega && entrega.estado !== 'PENDIENTE';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/mis-tareas">
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
        {yaCalificada && (
          <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
            Calificación: {entrega?.calificacion}
            {tarea.puntajeMaximo && `/${tarea.puntajeMaximo}`}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
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

            <div className="flex gap-6 text-sm pt-4 border-t">
              <span className="flex items-center gap-2">
                {esVencida ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={esVencida ? 'text-red-600' : ''}>
                  {esVencida ? 'Venció' : 'Vence'}:{' '}
                  {format(new Date(tarea.fechaVencimiento), 'PPP p', {
                    locale: es,
                  })}
                </span>
              </span>
              {tarea.puntajeMaximo && (
                <span>Puntaje máximo: {tarea.puntajeMaximo} pts</span>
              )}
            </div>

            {tarea.recursos?.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Recursos</h4>
                <div className="space-y-2">
                  {tarea.recursos.map((recurso) => (
                    <a
                      key={recurso.id}
                      href={recurso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>{recurso.titulo}</span>
                      <Badge variant="outline" className="ml-auto">
                        {recurso.tipo}
                      </Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Docente</p>
              <p className="font-medium">
                {tarea.docente.nombre} {tarea.docente.apellido}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge
                className={
                  yaCalificada
                    ? 'bg-green-100 text-green-800'
                    : yaEntregada
                    ? 'bg-blue-100 text-blue-800'
                    : esVencida
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }
              >
                {yaCalificada
                  ? 'Calificada'
                  : yaEntregada
                  ? 'Entregada'
                  : esVencida
                  ? 'Vencida'
                  : 'Pendiente'}
              </Badge>
            </div>
            {entrega?.fechaEntrega && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha de entrega</p>
                <p className="font-medium">
                  {format(new Date(entrega.fechaEntrega), 'PPP p', {
                    locale: es,
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {yaCalificada && entrega?.comentarioDocente && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">
              Retroalimentación del docente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{entrega.comentarioDocente}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {yaCalificada ? 'Tu entrega' : 'Entregar tarea'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contenido">Respuesta / Contenido</Label>
            <Textarea
              id="contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              rows={6}
              disabled={yaCalificada}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">Comentario (opcional)</Label>
            <Textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Agrega un comentario para el docente..."
              rows={2}
              disabled={yaCalificada}
            />
          </div>

          <div className="space-y-2">
            <Label>Archivos adjuntos</Label>
            {archivos.length > 0 && (
              <div className="space-y-2 mb-4">
                {archivos.map((archivo, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted rounded"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="flex-1 truncate">{archivo.nombre}</span>
                    <a
                      href={archivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    {!yaCalificada && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArchivo(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!yaCalificada && (
              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Adjuntar archivos
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {!yaCalificada && (
            <div className="flex gap-4 pt-4 border-t">
              <Link href="/dashboard/mis-tareas">
                <Button variant="outline">Cancelar</Button>
              </Link>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || uploading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entregando...
                  </>
                ) : yaEntregada ? (
                  'Actualizar entrega'
                ) : (
                  'Entregar tarea'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
