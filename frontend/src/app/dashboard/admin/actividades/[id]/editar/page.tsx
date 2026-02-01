'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { actividadesApi, institucionesApi, getMediaUrl } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Globe,
  Building2,
  Eye,
  EyeOff,
  Plus,
  Link as LinkIcon,
  Play,
} from 'lucide-react';

interface Institucion {
  id: string;
  nombre: string;
  slug: string;
}

interface ImagePreview {
  id: string;
  url: string;
  file?: File;
  isUrl?: boolean;
  isExisting?: boolean;
}

interface Actividad {
  id: string;
  titulo: string;
  contenido: string;
  urlArchivo?: string;
  fotos?: string[];
  videos?: string[];
  tipoMedia?: string;
  publicado: boolean;
  institucion?: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function EditarActividadPage() {
  const router = useRouter();
  const params = useParams();
  const actividadId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [institucionId, setInstitucionId] = useState('global');
  const [publicado, setPublicado] = useState(true);

  // Media state
  const [imagenes, setImagenes] = useState<ImagePreview[]>([]);
  const [urlImagenInput, setUrlImagenInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingVideos, setExistingVideos] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchData();
  }, [actividadId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [actividadRes, institucionesRes] = await Promise.all([
        actividadesApi.getById(actividadId),
        institucionesApi.getAll(),
      ]);

      const actividad: Actividad = actividadRes.data;
      const instData = institucionesRes.data.data || institucionesRes.data || [];
      setInstituciones(instData);

      // Cargar datos de la actividad
      setTitulo(actividad.titulo);
      setContenido(actividad.contenido);
      setInstitucionId(actividad.institucion?.id || 'global');
      setPublicado(actividad.publicado);

      // Cargar imágenes existentes (convertir a URLs absolutas para visualización)
      const existingImages: ImagePreview[] = [];
      if (actividad.fotos && actividad.fotos.length > 0) {
        actividad.fotos.forEach((url, index) => {
          existingImages.push({
            id: `existing-${index}`,
            url: getMediaUrl(url),
            isExisting: true,
            isUrl: true,
          });
        });
      } else if (actividad.urlArchivo) {
        existingImages.push({
          id: 'existing-0',
          url: getMediaUrl(actividad.urlArchivo),
          isExisting: true,
          isUrl: true,
        });
      }
      setImagenes(existingImages);

      // Cargar videos existentes
      if (actividad.videos && actividad.videos.length > 0) {
        setExistingVideos(actividad.videos);
        setVideoUrl(getMediaUrl(actividad.videos[0]));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMessage({ type: 'error', text: 'Error al cargar la actividad' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImagePreview[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const url = URL.createObjectURL(file);
        newImages.push({ id, url, file });
      }
    });

    setImagenes((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!urlImagenInput.trim()) return;

    const id = `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setImagenes((prev) => [...prev, { id, url: urlImagenInput.trim(), isUrl: true }]);
    setUrlImagenInput('');
  };

  const handleRemoveImage = (id: string) => {
    setImagenes((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image && !image.isUrl && !image.isExisting && image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }
      return prev.filter((img) => img.id !== id);
    });
    if (currentSlide >= imagenes.length - 1 && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl('');
      setExistingVideos([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('contenido', contenido);
      formData.append('publicado', String(publicado));

      if (institucionId !== 'global') {
        formData.append('institucionId', institucionId);
      }

      // Separar imágenes existentes de nuevas
      const existingUrls: string[] = [];
      const newUrls: string[] = [];

      imagenes.forEach((img) => {
        if (img.file) {
          formData.append('imagenes', img.file);
        } else if (img.isExisting) {
          existingUrls.push(img.url);
        } else if (img.isUrl) {
          newUrls.push(img.url);
        }
      });

      // Agregar URLs existentes
      if (existingUrls.length > 0) {
        formData.append('fotosExistentes', JSON.stringify(existingUrls));
      }

      // Agregar nuevas URLs
      if (newUrls.length > 0) {
        formData.append('fotosUrls', JSON.stringify(newUrls));
      }

      // Agregar video
      if (videoFile) {
        formData.append('video', videoFile);
      } else if (videoUrl.trim()) {
        formData.append('videoUrl', videoUrl.trim());
      } else if (existingVideos.length > 0) {
        formData.append('videosExistentes', JSON.stringify(existingVideos));
      }

      await actividadesApi.update(actividadId, formData);

      setMessage({ type: 'success', text: 'Actividad actualizada correctamente' });

      // Limpiar URLs de objetos
      imagenes.forEach((img) => {
        if (!img.isUrl && !img.isExisting && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });

      // Redirigir después de un momento
      setTimeout(() => {
        router.push('/dashboard/admin/actividades');
      }, 1500);
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al actualizar la actividad',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % imagenes.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + imagenes.length) % imagenes.length);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar Actividad</h1>
          <p className="text-muted-foreground">
            Modifica los datos de la actividad
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle>Informacion Basica</CardTitle>
            <CardDescription>
              Titulo y descripcion de la actividad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Titulo de la actividad"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contenido">Descripcion *</Label>
              <Textarea
                id="contenido"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Descripcion detallada de la actividad..."
                rows={6}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="institucion">Institucion</Label>
                <Select value={institucionId} onValueChange={setInstitucionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar institucion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <span className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Global (Landing principal)
                      </span>
                    </SelectItem>
                    {instituciones.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {inst.nombre}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={publicado ? 'publicado' : 'borrador'}
                  onValueChange={(value) => setPublicado(value === 'publicado')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publicado">
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Publicado
                      </span>
                    </SelectItem>
                    <SelectItem value="borrador">
                      <span className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        Borrador
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Imágenes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Imagenes
            </CardTitle>
            <CardDescription>
              Sube imagenes desde tu computadora o agrega URLs de imagenes externas. Puedes agregar varias imagenes para crear un slider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview de imágenes con slider */}
            {imagenes.length > 0 && (
              <div className="space-y-4">
                {/* Slider principal */}
                <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                  <Image
                    src={imagenes[currentSlide]?.url || ''}
                    alt={`Imagen ${currentSlide + 1}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />

                  {/* Controles del slider */}
                  {imagenes.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={nextSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors rotate-180"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Indicadores */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {imagenes.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentSlide ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Botón eliminar */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(imagenes[currentSlide]?.id)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Contador */}
                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {currentSlide + 1} / {imagenes.length}
                  </div>
                </div>

                {/* Miniaturas */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {imagenes.map((img, index) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setCurrentSlide(index)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                        index === currentSlide
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={`Miniatura ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {img.isExisting && (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-[10px] text-center">
                          Existente
                        </div>
                      )}
                      {img.isUrl && !img.isExisting && (
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-500/80 text-white text-[10px] text-center">
                          URL
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Controles para agregar imágenes */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Subir desde computadora */}
              <div className="space-y-2">
                <Label>Subir desde computadora</Label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar imagenes
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos: JPEG, PNG, GIF, WebP. Max 50MB por archivo.
                </p>
              </div>

              {/* Agregar por URL */}
              <div className="space-y-2">
                <Label>Agregar por URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={urlImagenInput}
                    onChange={(e) => setUrlImagenInput(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddImageUrl}
                    disabled={!urlImagenInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pega la URL de una imagen externa y presiona Enter o el boton +
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Video (Opcional)
            </CardTitle>
            <CardDescription>
              Agrega un video a la actividad. Puedes subir un archivo o pegar una URL de YouTube/Vimeo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview de video */}
            {(videoFile || videoUrl || existingVideos.length > 0) && (
              <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden">
                {videoFile ? (
                  <video
                    src={URL.createObjectURL(videoFile)}
                    className="w-full h-full object-contain"
                    controls
                  />
                ) : (videoUrl || existingVideos[0]) ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <Play className="w-16 h-16 mb-2" />
                    <p className="text-sm">Video externo</p>
                    <p className="text-xs text-muted-foreground truncate max-w-full px-4">
                      {videoUrl || existingVideos[0]}
                    </p>
                  </div>
                ) : null}

                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={() => {
                    setVideoFile(null);
                    setVideoUrl('');
                    setExistingVideos([]);
                  }}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Subir video */}
              <div className="space-y-2">
                <Label>Subir video</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileSelect}
                    className="hidden"
                    id="video-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    disabled={!!videoUrl}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar video
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos: MP4, WebM, OGG, MOV. Max 50MB.
                </p>
              </div>

              {/* URL de video */}
              <div className="space-y-2">
                <Label>URL de video</Label>
                <div className="flex gap-2">
                  <Input
                    value={videoUrl}
                    onChange={(e) => {
                      setVideoUrl(e.target.value);
                      if (e.target.value) {
                        setVideoFile(null);
                        setExistingVideos([]);
                      }
                    }}
                    placeholder="https://youtube.com/watch?v=..."
                    disabled={!!videoFile}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!videoUrl}
                    onClick={() => window.open(videoUrl, '_blank')}
                  >
                    <LinkIcon className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  YouTube, Vimeo u otra URL de video
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
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
    </div>
  );
}
