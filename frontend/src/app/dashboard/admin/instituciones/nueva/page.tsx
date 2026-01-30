'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { institucionesApi } from '@/lib/api';
import { ArrowLeft, Building2, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

const PAISES = [
  { value: 'DO', label: 'República Dominicana' },
  { value: 'HT', label: 'Haití' },
];

const SISTEMAS_EDUCATIVOS = [
  { value: 'RD_POLITECNICO', label: 'RD - Politécnico' },
  { value: 'RD_GENERAL', label: 'RD - General' },
  { value: 'RD_PRIMARIA', label: 'RD - Primaria' },
  { value: 'HAITI', label: 'Haití' },
];

export default function NuevaInstitucionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    pais: 'DO',
    sistemaEducativo: 'RD_GENERAL',
    colorPrimario: '#1a365d',
    colorSecundario: '#3182ce',
    director: {
      nombre: '',
      apellido: '',
      email: '',
    },
  });

  const handleLogoChange = (file: File | null, previewUrl: string | null) => {
    setLogoFile(file);
    setLogoPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Crear FormData para enviar con el logo
      const data = new FormData();
      data.append('nombre', formData.nombre);
      data.append('pais', formData.pais);
      data.append('sistemaEducativo', formData.sistemaEducativo);
      data.append('colores', JSON.stringify({
        primario: formData.colorPrimario,
        secundario: formData.colorSecundario,
      }));
      data.append('director', JSON.stringify(formData.director));

      if (logoFile) {
        data.append('logo', logoFile);
      }

      await institucionesApi.create(data);
      router.push('/dashboard/admin/instituciones');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear la institución');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin/instituciones">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Institución</h1>
          <p className="text-muted-foreground">
            Registra una nueva institución educativa en el sistema
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información de la Institución
            </CardTitle>
            <CardDescription>
              Datos generales de la institución
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col items-center space-y-4">
              <Label className="text-center">Logo del Centro Educativo</Label>
              <div className="w-40 h-40">
                <ImageUpload
                  value={logoPreview || undefined}
                  onChange={handleLogoChange}
                  placeholder="Subir logo del centro"
                  aspectRatio="square"
                  maxSizeMB={2}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Formatos: JPG, PNG. Tamaño recomendado: 200x200px
              </p>
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la Institución *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Colegio San José"
                required
              />
            </div>

            {/* País y Sistema */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pais">País *</Label>
                <select
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {PAISES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sistema">Sistema Educativo *</Label>
                <select
                  id="sistema"
                  value={formData.sistemaEducativo}
                  onChange={(e) => setFormData({ ...formData, sistemaEducativo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {SISTEMAS_EDUCATIVOS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Colores */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="colorPrimario">Color Primario</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="colorPrimario"
                    value={formData.colorPrimario}
                    onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.colorPrimario}
                    onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                    placeholder="#1a365d"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorSecundario">Color Secundario</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="colorSecundario"
                    value={formData.colorSecundario}
                    onChange={(e) => setFormData({ ...formData, colorSecundario: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={formData.colorSecundario}
                    onChange={(e) => setFormData({ ...formData, colorSecundario: e.target.value })}
                    placeholder="#3182ce"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del Director */}
        <Card>
          <CardHeader>
            <CardTitle>Director/a de la Institución</CardTitle>
            <CardDescription>
              Se creará una cuenta automáticamente para el director
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="directorNombre">Nombre *</Label>
                <Input
                  id="directorNombre"
                  value={formData.director.nombre}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      director: { ...formData.director, nombre: e.target.value },
                    })
                  }
                  placeholder="Nombre del director"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directorApellido">Apellido *</Label>
                <Input
                  id="directorApellido"
                  value={formData.director.apellido}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      director: { ...formData.director, apellido: e.target.value },
                    })
                  }
                  placeholder="Apellido del director"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="directorEmail">Correo Electrónico *</Label>
              <Input
                id="directorEmail"
                type="email"
                value={formData.director.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    director: { ...formData.director, email: e.target.value },
                  })
                }
                placeholder="director@escuela.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se enviará la contraseña temporal a este correo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4">
          <Link href="/dashboard/admin/instituciones" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Institución
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
