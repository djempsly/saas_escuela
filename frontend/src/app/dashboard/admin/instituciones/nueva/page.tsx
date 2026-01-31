'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { institucionesApi, adminApi } from '@/lib/api';
import { ArrowLeft, Building2, Loader2, Save, Globe, Check, X, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';

interface Director {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  institucionId?: string | null;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ message: string }>;
    };
  };
  message?: string;
}

const PAISES = [
  { value: 'DO', label: 'Republica Dominicana' },
  { value: 'HT', label: 'Haiti' },
];

const SISTEMAS_EDUCATIVOS = {
  DO: [
    { value: 'PRIMARIA_DO', label: 'Primaria' },
    { value: 'SECUNDARIA_GENERAL_DO', label: 'Secundaria General' },
    { value: 'POLITECNICO_DO', label: 'Politecnico' },
  ],
  HT: [
    { value: 'PRIMARIA_HT', label: 'Primaria' },
    { value: 'SECUNDARIA_HT', label: 'Secundaria' },
  ],
};

const IDIOMAS_POR_PAIS = {
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

export default function NuevaInstitucionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Director selection state
  const [directores, setDirectores] = useState<Director[]>([]);
  const [loadingDirectores, setLoadingDirectores] = useState(false);
  const [directorMode, setDirectorMode] = useState<'existing' | 'new'>('new');
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('');

  // Validacion de slug y dominio
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [dominioStatus, setDominioStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    dominioPersonalizado: '',
    autogestionActividades: false,
    pais: 'DO' as 'DO' | 'HT',
    sistemaEducativo: 'SECUNDARIA_GENERAL_DO',
    idiomaPrincipal: 'ESPANOL',
    colorPrimario: '#1a365d',
    colorSecundario: '#3182ce',
    director: {
      nombre: '',
      apellido: '',
      email: '',
    },
  });

  // Cargar directores disponibles (sin institucion asignada)
  useEffect(() => {
    const fetchDirectores = async () => {
      setLoadingDirectores(true);
      try {
        const response = await adminApi.getAllDirectores();
        const data = response.data?.data || [];
        // Filtrar solo directores sin institucion asignada
        const disponibles = data.filter((d: Director) => !d.institucionId);
        setDirectores(disponibles);
      } catch (err) {
        console.error('Error cargando directores:', err);
      } finally {
        setLoadingDirectores(false);
      }
    };
    fetchDirectores();
  }, []);

  // Auto-generar slug cuando cambia el nombre
  const handleNombreChange = (nombre: string) => {
    const newSlug = generateSlug(nombre);
    setFormData({ ...formData, nombre, slug: newSlug });
    setSlugStatus('idle');
  };

  // Verificar disponibilidad de slug
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    try {
      const response = await institucionesApi.checkSlug(slug);
      setSlugStatus(response.data.available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  // Verificar disponibilidad de dominio
  const checkDominioAvailability = useCallback(async (dominio: string) => {
    if (!dominio) {
      setDominioStatus('idle');
      return;
    }

    setDominioStatus('checking');
    try {
      const response = await institucionesApi.checkDominio(dominio);
      setDominioStatus(response.data.available ? 'available' : 'taken');
    } catch {
      setDominioStatus('idle');
    }
  }, []);

  // Debounce para verificar slug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug) {
        checkSlugAvailability(formData.slug);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.slug, checkSlugAvailability]);

  // Debounce para verificar dominio
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.dominioPersonalizado) {
        checkDominioAvailability(formData.dominioPersonalizado);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.dominioPersonalizado, checkDominioAvailability]);

  // Actualizar sistema educativo e idioma cuando cambia el país
  const handlePaisChange = (pais: 'DO' | 'HT') => {
    const defaultSistema = pais === 'DO' ? 'SECUNDARIA_GENERAL_DO' : 'PRIMARIA_HT';
    const defaultIdioma = pais === 'DO' ? 'ESPANOL' : 'KREYOL';
    setFormData({ ...formData, pais, sistemaEducativo: defaultSistema, idiomaPrincipal: defaultIdioma });
  };

  const handleLogoChange = (file: File | null, previewUrl: string | null) => {
    setLogoFile(file);
    setLogoPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validar slug disponible
    if (slugStatus === 'taken') {
      setError('El slug ya esta en uso por otra institucion');
      setIsLoading(false);
      return;
    }

    // Validar dominio disponible si se proporciono
    if (formData.dominioPersonalizado && dominioStatus === 'taken') {
      setError('El dominio personalizado ya esta en uso');
      setIsLoading(false);
      return;
    }

    // Validar que se haya seleccionado o ingresado un director
    if (directorMode === 'existing' && !selectedDirectorId) {
      setError('Debe seleccionar un director existente');
      setIsLoading(false);
      return;
    }

    if (directorMode === 'new' && (!formData.director.nombre || !formData.director.apellido)) {
      setError('Debe ingresar nombre y apellido del nuevo director');
      setIsLoading(false);
      return;
    }

    try {
      // Construir payload segun el modo de director
      const payload: Record<string, unknown> = {
        nombre: formData.nombre,
        pais: formData.pais,
        sistemaEducativo: formData.sistemaEducativo,
        idiomaPrincipal: formData.idiomaPrincipal,
        autogestionActividades: formData.autogestionActividades,
        colores: {
          primario: formData.colorPrimario,
          secundario: formData.colorSecundario,
        },
      };

      // Solo agregar slug si tiene valor
      if (formData.slug) {
        payload.slug = formData.slug;
      }

      // Solo agregar dominio si tiene valor
      if (formData.dominioPersonalizado) {
        payload.dominioPersonalizado = formData.dominioPersonalizado;
      }

      if (directorMode === 'existing') {
        payload.directorId = selectedDirectorId;
      } else {
        const directorData: Record<string, string> = {
          nombre: formData.director.nombre,
          apellido: formData.director.apellido,
        };
        // Solo agregar email si tiene valor
        if (formData.director.email) {
          directorData.email = formData.director.email;
        }
        payload.director = directorData;
      }

      const response = await institucionesApi.createJson(payload);

      // Si hay logo, subirlo despues de crear la institucion
      if (logoFile && response.data?.data?.institucion?.id) {
        const logoData = new FormData();
        logoData.append('logo', logoFile);
        await institucionesApi.updateConfig(response.data.data.institucion.id, logoData);
      }

      // Mostrar contrasena temporal del director (solo si se creo uno nuevo)
      if (response.data?.data?.tempPassword) {
        alert(`Institucion creada exitosamente.\n\nContrasena temporal del director: ${response.data.data.tempPassword}\n\nGuardela en un lugar seguro.`);
      } else {
        alert('Institucion creada exitosamente.');
      }

      router.push('/dashboard/admin/instituciones');
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Error completo:', apiError);

      // Mejorar extraccion del mensaje de error
      let errorMsg = 'Error al crear la institucion';

      if (apiError.response?.data) {
        if (apiError.response.data.errors && Array.isArray(apiError.response.data.errors)) {
          errorMsg = apiError.response.data.errors.map((e) => e.message).join(', ');
        } else if (apiError.response.data.message) {
          errorMsg = apiError.response.data.message;
        }
      } else if (apiError.message) {
        errorMsg = apiError.message;
      }

      setError(errorMsg);
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
              <Label htmlFor="nombre">Nombre de la Institucion *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                placeholder="Ej: Colegio San Jose"
                required
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">
                URL Amigable (Slug) *
                <span className="text-xs text-muted-foreground ml-2">
                  Se usa para acceder a la landing: /slug
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData({ ...formData, slug: generateSlug(e.target.value) });
                    setSlugStatus('idle');
                  }}
                  placeholder="colegio-san-jose"
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
              {slugStatus === 'available' && (
                <p className="text-xs text-green-600">Slug disponible</p>
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
              <p className="text-xs text-muted-foreground">
                Si configura un dominio, los usuarios podran acceder directamente desde ese dominio
              </p>
              {dominioStatus === 'taken' && (
                <p className="text-xs text-red-600">Este dominio ya esta en uso</p>
              )}
            </div>

            {/* Autogestion de Actividades */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-lg">
              <input
                type="checkbox"
                id="autogestion"
                checked={formData.autogestionActividades}
                onChange={(e) =>
                  setFormData({ ...formData, autogestionActividades: e.target.checked })
                }
                className="w-4 h-4 rounded border-gray-300"
              />
              <div>
                <Label htmlFor="autogestion" className="cursor-pointer">
                  Permitir autogestion de actividades
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si se activa, el director podra crear y gestionar actividades para su landing page
                </p>
              </div>
            </div>

            {/* País, Sistema e Idioma */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pais">País *</Label>
                <select
                  id="pais"
                  value={formData.pais}
                  onChange={(e) => handlePaisChange(e.target.value as 'DO' | 'HT')}
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
                  {SISTEMAS_EDUCATIVOS[formData.pais].map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idioma">Idioma Principal *</Label>
                <select
                  id="idioma"
                  value={formData.idiomaPrincipal}
                  onChange={(e) => setFormData({ ...formData, idiomaPrincipal: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  {IDIOMAS_POR_PAIS[formData.pais].map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Idioma por defecto de la landing page
                </p>
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
              Selecciona un director existente o crea uno nuevo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selector de modo */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <Button
                type="button"
                variant={directorMode === 'existing' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setDirectorMode('existing')}
              >
                <Users className="w-4 h-4 mr-2" />
                Director Existente
              </Button>
              <Button
                type="button"
                variant={directorMode === 'new' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setDirectorMode('new')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Nuevo
              </Button>
            </div>

            {directorMode === 'existing' ? (
              <div className="space-y-2">
                <Label>Seleccionar Director *</Label>
                {loadingDirectores ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando directores...
                  </div>
                ) : directores.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
                    No hay directores disponibles. Todos los directores ya tienen institucion asignada.
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-amber-700 underline ml-2 p-0"
                      onClick={() => setDirectorMode('new')}
                    >
                      Crear uno nuevo
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedDirectorId}
                    onValueChange={setSelectedDirectorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar un director..." />
                    </SelectTrigger>
                    <SelectContent>
                      {directores.map((director) => (
                        <SelectItem key={director.id} value={director.id}>
                          {director.nombre} {director.apellido}
                          {director.email && (
                            <span className="text-muted-foreground ml-2">
                              ({director.email})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Solo se muestran directores que no tienen institucion asignada
                </p>
              </div>
            ) : (
              <>
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
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="directorEmail">
                    Correo Electronico
                    <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
                  </Label>
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Si se proporciona, se enviara la contrasena temporal a este correo.
                    Si no, debera compartir la contrasena manualmente.
                  </p>
                </div>
              </>
            )}
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
