'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { institucionesApi, getMediaUrl } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  Globe,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface Institucion {
  id: string;
  nombre: string;
  lema?: string;
  slug: string;
  dominioPersonalizado?: string;
  pais: string;
  sistema: string;
  idiomaPrincipal?: string;
  logoUrl?: string;
  logoPosicion?: string;
  fondoLoginUrl?: string;
  colorPrimario: string;
  colorSecundario: string;
  activo: boolean;
  autogestionActividades: boolean;
  codigoCentro?: string;
  distritoEducativo?: string;
  regionalEducacion?: string;
}

const LOGO_POSICIONES = [
  { value: 'left', label: 'Izquierda' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Derecha' },
];

const IDIOMAS_POR_PAIS: Record<string, Array<{ value: string; label: string }>> = {
  DO: [
    { value: 'ESPANOL', label: 'Español' },
    { value: 'INGLES', label: 'Inglés' },
  ],
  HT: [
    { value: 'KREYOL', label: 'Kreyòl' },
    { value: 'FRANCES', label: 'Français' },
    { value: 'INGLES', label: 'English' },
  ],
};

// Funcion para generar slug desde nombre
const generateSlug = (nombre: string): string => {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export default function EditarInstitucionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fondoLoginFile, setFondoLoginFile] = useState<File | null>(null);
  const [fondoLoginPreview, setFondoLoginPreview] = useState<string | null>(null);

  // Validacion de slug y dominio
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [dominioStatus, setDominioStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const [formData, setFormData] = useState({
    nombre: '',
    lema: '',
    slug: '',
    dominioPersonalizado: '',
    pais: 'DO',
    idiomaPrincipal: 'ESPANOL',
    logoPosicion: 'center',
    colorPrimario: '#1a365d',
    colorSecundario: '#3182ce',
    activo: true,
    autogestionActividades: false,
    codigoCentro: '',
    distritoEducativo: '',
    regionalEducacion: '',
  });

  const [originalSlug, setOriginalSlug] = useState('');
  const [originalDominio, setOriginalDominio] = useState('');

  useEffect(() => {
    if (id) {
      fetchInstitucion();
    }
  }, [id]);

  const fetchInstitucion = async () => {
    try {
      setIsLoading(true);
      const response = await institucionesApi.getById(id);
      const inst = response.data;

      setFormData({
        nombre: inst.nombre || '',
        lema: inst.lema || '',
        slug: inst.slug || '',
        dominioPersonalizado: inst.dominioPersonalizado || '',
        pais: inst.pais || 'DO',
        idiomaPrincipal: inst.idiomaPrincipal || 'ESPANOL',
        logoPosicion: inst.logoPosicion || 'center',
        colorPrimario: inst.colorPrimario || '#1a365d',
        colorSecundario: inst.colorSecundario || '#3182ce',
        activo: inst.activo,
        autogestionActividades: inst.autogestionActividades || false,
        codigoCentro: inst.codigoCentro || '',
        distritoEducativo: inst.distritoEducativo || '',
        regionalEducacion: inst.regionalEducacion || '',
      });

      setLogoPreview(inst.logoUrl ? getMediaUrl(inst.logoUrl) : null);
      setFondoLoginPreview(inst.fondoLoginUrl ? getMediaUrl(inst.fondoLoginUrl) : null);
      setOriginalSlug(inst.slug || '');
      setOriginalDominio(inst.dominioPersonalizado || '');
    } catch (err) {
      console.error('Error cargando institucion:', err);
      setError('No se pudo cargar la institucion');
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar disponibilidad de slug
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3 || slug === originalSlug) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    try {
      const response = await institucionesApi.checkSlug(slug, id);
      setSlugStatus(response.data.available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, [id, originalSlug]);

  // Verificar disponibilidad de dominio
  const checkDominioAvailability = useCallback(async (dominio: string) => {
    if (!dominio || dominio === originalDominio) {
      setDominioStatus('idle');
      return;
    }

    setDominioStatus('checking');
    try {
      const response = await institucionesApi.checkDominio(dominio, id);
      setDominioStatus(response.data.available ? 'available' : 'taken');
    } catch {
      setDominioStatus('idle');
    }
  }, [id, originalDominio]);

  // Debounce para verificar slug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug && formData.slug !== originalSlug) {
        checkSlugAvailability(formData.slug);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.slug, checkSlugAvailability, originalSlug]);

  // Debounce para verificar dominio
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.dominioPersonalizado && formData.dominioPersonalizado !== originalDominio) {
        checkDominioAvailability(formData.dominioPersonalizado);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.dominioPersonalizado, checkDominioAvailability, originalDominio]);

  const handleLogoChange = (file: File | null, previewUrl: string | null) => {
    setLogoFile(file);
    setLogoPreview(previewUrl);
  };

  const handleFondoLoginChange = (file: File | null, previewUrl: string | null) => {
    setFondoLoginFile(file);
    setFondoLoginPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    // Validar slug disponible
    if (slugStatus === 'taken') {
      setError('El slug ya esta en uso por otra institucion');
      setIsSaving(false);
      return;
    }

    // Validar dominio disponible
    if (formData.dominioPersonalizado && dominioStatus === 'taken') {
      setError('El dominio personalizado ya esta en uso');
      setIsSaving(false);
      return;
    }

    try {
      // Actualizar configuracion sensible (nombre, slug, dominio, idioma, posicion logo, activo, autogestion)
      await institucionesApi.updateSensitive(id, {
        nombre: formData.nombre,
        slug: formData.slug,
        dominioPersonalizado: formData.dominioPersonalizado || null,
        idiomaPrincipal: formData.idiomaPrincipal,
        logoPosicion: formData.logoPosicion,
        activo: formData.activo,
        autogestionActividades: formData.autogestionActividades,
      });

      // Actualizar configuracion visual (colores, logo, fondo login)
      const configData = new FormData();
      configData.append('colorPrimario', formData.colorPrimario);
      configData.append('colorSecundario', formData.colorSecundario);
      if (formData.lema) {
        configData.append('lema', formData.lema);
      }
      if (logoFile) {
        configData.append('logo', logoFile);
      }
      if (fondoLoginFile) {
        configData.append('fondoLogin', fondoLoginFile);
      }

      await institucionesApi.updateConfig(id, configData);

      setSuccess('Institucion actualizada correctamente');
      setOriginalSlug(formData.slug);
      setOriginalDominio(formData.dominioPersonalizado);

      // Redirigir despues de 2 segundos
      setTimeout(() => {
        router.push(`/dashboard/admin/instituciones/${id}`);
      }, 2000);
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Error actualizando:', err);
      setError(apiError.response?.data?.message || 'Error al actualizar la institucion');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !formData.nombre) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">Institucion no encontrada</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/dashboard/admin/instituciones">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a instituciones
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/admin/instituciones/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar Institucion</h1>
          <p className="text-muted-foreground">{formData.nombre}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informacion basica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Informacion Basica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-center space-y-4">
              <Label>Logo de la Institucion</Label>
              <div className="w-40 h-40">
                <ImageUpload
                  value={logoPreview || undefined}
                  onChange={handleLogoChange}
                  placeholder="Subir logo"
                  aspectRatio="square"
                  maxSizeMB={2}
                />
              </div>
            </div>

            {/* Posicion del Logo en Landing */}
            <div className="space-y-2">
              <Label htmlFor="logoPosicion">Posicion del Logo en Landing Page</Label>
              <div className="flex gap-2">
                {LOGO_POSICIONES.map((pos) => (
                  <button
                    key={pos.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, logoPosicion: pos.value })}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                      formData.logoPosicion === pos.value
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Define donde se mostrara el logo y nombre en la seccion principal del landing
              </p>
            </div>

            {/* Imagen de fondo para Login */}
            <div className="space-y-4">
              <Label>Imagen de Fondo para Pagina de Login</Label>
              <div className="w-full h-40">
                <ImageUpload
                  value={fondoLoginPreview || undefined}
                  onChange={handleFondoLoginChange}
                  placeholder="Subir imagen de fondo"
                  aspectRatio="banner"
                  maxSizeMB={5}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Esta imagen se mostrara como fondo en la pagina de login de la institucion.
                Recomendamos una imagen de al menos 1920x1080 pixeles.
              </p>
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            {/* Lema */}
            <div className="space-y-2">
              <Label htmlFor="lema">Lema (opcional)</Label>
              <Input
                id="lema"
                value={formData.lema}
                onChange={(e) => setFormData({ ...formData, lema: e.target.value })}
                placeholder="Formando lideres del manana..."
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">URL Amigable (Slug) *</Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData({ ...formData, slug: generateSlug(e.target.value) });
                    setSlugStatus('idle');
                  }}
                  required
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {slugStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                  {slugStatus === 'taken' && (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>
              {slugStatus === 'taken' && (
                <p className="text-xs text-red-600">Este slug ya esta en uso</p>
              )}
            </div>

            {/* Dominio Personalizado */}
            <div className="space-y-2">
              <Label htmlFor="dominio">
                <Globe className="w-4 h-4 inline mr-1" />
                Dominio Personalizado (opcional)
              </Label>
              <div className="relative">
                <Input
                  id="dominio"
                  value={formData.dominioPersonalizado}
                  onChange={(e) => {
                    setFormData({ ...formData, dominioPersonalizado: e.target.value });
                    setDominioStatus('idle');
                  }}
                  placeholder="miescuela.edu.do"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {dominioStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {dominioStatus === 'available' && formData.dominioPersonalizado && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                  {dominioStatus === 'taken' && (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>
              {dominioStatus === 'taken' && (
                <p className="text-xs text-red-600">Este dominio ya esta en uso</p>
              )}
            </div>

            {/* Idioma Principal */}
            <div className="space-y-2">
              <Label htmlFor="idioma">Idioma Principal</Label>
              <select
                id="idioma"
                value={formData.idiomaPrincipal}
                onChange={(e) => setFormData({ ...formData, idiomaPrincipal: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(IDIOMAS_POR_PAIS[formData.pais] || IDIOMAS_POR_PAIS['DO']).map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Idioma por defecto de la landing page y sistema
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Colores */}
        <Card>
          <CardHeader>
            <CardTitle>Colores</CardTitle>
          </CardHeader>
          <CardContent>
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
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuracion */}
        <Card>
          <CardHeader>
            <CardTitle>Configuracion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label>Institucion Activa</Label>
                <p className="text-sm text-muted-foreground">
                  Las instituciones inactivas no pueden acceder al sistema
                </p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label>Autogestion de Actividades</Label>
                <p className="text-sm text-muted-foreground">
                  Permite al director crear actividades en la landing
                </p>
              </div>
              <Switch
                checked={formData.autogestionActividades}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, autogestionActividades: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos ministeriales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Ministeriales (opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="codigoCentro">Codigo de Centro</Label>
                <Input
                  id="codigoCentro"
                  value={formData.codigoCentro}
                  onChange={(e) => setFormData({ ...formData, codigoCentro: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="distritoEducativo">Distrito Educativo</Label>
                <Input
                  id="distritoEducativo"
                  value={formData.distritoEducativo}
                  onChange={(e) => setFormData({ ...formData, distritoEducativo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regionalEducacion">Regional de Educacion</Label>
                <Input
                  id="regionalEducacion"
                  value={formData.regionalEducacion}
                  onChange={(e) => setFormData({ ...formData, regionalEducacion: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensajes */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4">
          <Link href={`/dashboard/admin/instituciones/${id}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? (
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
        </div>
      </form>
    </div>
  );
}
