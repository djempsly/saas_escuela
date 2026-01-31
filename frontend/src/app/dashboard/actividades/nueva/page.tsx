'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, Upload, Image as ImageIcon, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function NuevaActividadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.titulo.trim() || !formData.contenido.trim()) {
      setError('El titulo y contenido son requeridos');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('titulo', formData.titulo);
      submitData.append('contenido', formData.contenido);
      if (imageFile) {
        submitData.append('archivo', imageFile);
      }

      await api.post('/actividades', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      router.push('/dashboard/actividades');
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al crear actividad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/actividades">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nueva Actividad</h1>
          <p className="text-muted-foreground">
            Publicar una nueva actividad o noticia
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

            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) =>
                  setFormData({ ...formData, titulo: e.target.value })
                }
                placeholder="Ej: Festival de Primavera 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contenido">Contenido *</Label>
              <Textarea
                id="contenido"
                value={formData.contenido}
                onChange={(e) =>
                  setFormData({ ...formData, contenido: e.target.value })
                }
                placeholder="Describe la actividad..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagen (opcional)</Label>
              {imagePreview ? (
                <div className="relative w-full max-w-md">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={400}
                    height={300}
                    className="rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Arrastra una imagen o haz clic para seleccionar
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Seleccionar imagen
                      </span>
                    </Button>
                  </Label>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-end pt-4 border-t">
              <Link href="/dashboard/actividades">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  'Publicar Actividad'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
