'use client';

import { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { usersApi } from '@/lib/api';
import { Loader2, Save, User } from 'lucide-react';
import Image from 'next/image';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Función para construir la URL completa de la imagen
const getFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // Si la URL comienza con /uploads, añadir el dominio del backend
  return `${API_BASE_URL}${url}`;
};

export default function PerfilPage() {
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const initialFotoUrl = useMemo(() => getFullImageUrl(user?.fotoUrl), [user?.fotoUrl]);
  const [fotoPreview, setFotoPreview] = useState<string | null>(initialFotoUrl);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
  });

  const handlePhotoChange = (file: File | null, previewUrl: string | null) => {
    setFotoFile(file);
    setFotoPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const data = new FormData();
      data.append('nombre', formData.nombre);
      data.append('apellido', formData.apellido);
      if (formData.email) {
        data.append('email', formData.email);
      }
      if (fotoFile) {
        data.append('foto', fotoFile);
      }

      const response = await usersApi.updateProfile(data);

      // Actualizar store con nuevos datos
      const newFotoUrl = response.data.fotoUrl || response.data.data?.fotoUrl;
      updateUser({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        fotoUrl: newFotoUrl,
      });

      // Actualizar preview con la URL completa
      if (newFotoUrl) {
        setFotoPreview(getFullImageUrl(newFotoUrl));
      }

      setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Error al actualizar el perfil',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Actualiza tu información personal y foto de perfil
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Modifica tus datos y haz clic en guardar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto de Perfil */}
            <div className="flex flex-col items-center space-y-4">
              <Label className="text-center">Foto de Perfil</Label>

              {/* Contenedor de preview de foto */}
              <div className="relative">
                {fotoPreview ? (
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                    <Image
                      src={fotoPreview}
                      alt="Foto de perfil"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center">
                    <User className="w-16 h-16 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Upload de imagen */}
              <div className="w-48">
                <ImageUpload
                  value={fotoPreview || undefined}
                  onChange={handlePhotoChange}
                  placeholder="Cambiar foto"
                  aspectRatio="square"
                  shape="circle"
                  maxSizeMB={2}
                />
              </div>
            </div>

            {/* Datos personales */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tu@correo.com (opcional)"
              />
            </div>

            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input
                value={user?.username || ''}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-muted-foreground">
                El nombre de usuario no puede ser modificado
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Input
                value={user?.role || ''}
                disabled
                className="bg-slate-50"
              />
            </div>

            {/* Mensajes */}
            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Botón de guardar */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
