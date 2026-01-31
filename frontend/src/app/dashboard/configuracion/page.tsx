'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ui/image-upload';
import { institucionesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { useI18nStore, localeNames, systemLanguages, Locale } from '@/lib/i18n';
import {
  Palette,
  Globe,
  Building2,
  Save,
  Loader2,
  Languages,
  Lock,
  BookOpen,
  Info,
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

interface ExtendedBranding {
  id?: string;
  nombre?: string;
  lema?: string | null;
  logoUrl?: string | null;
  colorPrimario?: string;
  colorSecundario?: string;
  pais?: string;
  sistemaEducativo?: string;
  idiomaPrincipal?: string;
  slug?: string;
  autogestionActividades?: boolean;
}

export default function ConfiguracionPage() {
  const { user } = useAuthStore();
  const { branding, setBranding } = useInstitutionStore();
  const { locale, setLocale } = useI18nStore();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [extendedBranding, setExtendedBranding] = useState<ExtendedBranding | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(branding?.logoUrl || null);

  const [formData, setFormData] = useState({
    colorPrimario: branding?.colorPrimario || '#1a365d',
    colorSecundario: branding?.colorSecundario || '#3182ce',
  });

  // Configuracion de colores para notas
  const [gradeColors, setGradeColors] = useState({
    excelente: '#22c55e', // 90-100
    bueno: '#3b82f6',     // 80-89
    regular: '#f59e0b',   // 70-79
    deficiente: '#ef4444', // <70
  });

  const availableLanguages = branding?.sistemaEducativo
    ? systemLanguages[branding.sistemaEducativo] || ['es', 'en']
    : ['es', 'en', 'fr', 'ht'];

  // Cargar branding extendido para DIRECTOR
  useEffect(() => {
    const loadExtendedBranding = async () => {
      if (user?.role === 'DIRECTOR' && user?.institucionId) {
        try {
          const response = await institucionesApi.getBranding(user.institucionId);
          setExtendedBranding(response.data);
        } catch (error) {
          console.error('Error loading extended branding:', error);
        }
      }
    };
    loadExtendedBranding();
  }, [user]);

  const handleLogoChange = (file: File | null, previewUrl: string | null) => {
    setLogoFile(file);
    setLogoPreview(previewUrl);
  };

  const handleSave = async () => {
    if (!user?.institucionId) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const data = new FormData();
      data.append('colorPrimario', formData.colorPrimario);
      data.append('colorSecundario', formData.colorSecundario);
      data.append('gradeColors', JSON.stringify(gradeColors));

      if (logoFile) {
        data.append('logo', logoFile);
      }

      await institucionesApi.updateConfig(user.institucionId, data);

      // Actualizar branding local
      setBranding({
        ...branding!,
        colorPrimario: formData.colorPrimario,
        colorSecundario: formData.colorSecundario,
        logoUrl: logoPreview || branding?.logoUrl,
      });

      setMessage({ type: 'success', text: 'Configuracion guardada correctamente' });
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al guardar la configuracion',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = ['ADMIN', 'DIRECTOR'].includes(user?.role || '');
  const isDirector = user?.role === 'DIRECTOR';
  const canManageActividades = isDirector && extendedBranding?.autogestionActividades;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza la apariencia y preferencias de tu institución
        </p>
      </div>

      {/* Aviso para Director sobre campos restringidos */}
      {isDirector && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Lock className="w-5 h-5" />
              Configuracion Restringida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              Como Director, puedes modificar el logo, colores y configuracion visual.
              Los campos sensibles como nombre de la institucion, slug y dominio
              solo pueden ser modificados por un Administrador.
            </p>
            {extendedBranding && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                <p className="text-xs text-muted-foreground mb-1">Informacion de tu institucion:</p>
                <p className="font-medium">{extendedBranding.nombre}</p>
                {extendedBranding.slug && (
                  <p className="text-sm text-muted-foreground">
                    URL: /{extendedBranding.slug}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seccion de Actividades para Director con Autogestion */}
      {canManageActividades && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <BookOpen className="w-5 h-5" />
              Gestion de Actividades
            </CardTitle>
            <CardDescription className="text-green-700">
              Tu institucion tiene habilitada la autogestion de actividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-4">
              Puedes crear y gestionar actividades que apareceran en la landing page de tu institucion.
            </p>
            <Link href="/dashboard/actividades">
              <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                <BookOpen className="w-4 h-4 mr-2" />
                Ir a Actividades
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Aviso si Director NO tiene autogestion */}
      {isDirector && !canManageActividades && extendedBranding && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-slate-600">
              <Info className="w-5 h-5" />
              Actividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              La gestion de actividades no esta habilitada para tu institucion.
              Contacta al administrador si necesitas publicar actividades en tu landing page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Idioma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Idioma del Sistema
          </CardTitle>
          <CardDescription>
            Selecciona el idioma de la interfaz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableLanguages.map((lang) => (
              <Button
                key={lang}
                variant={locale === lang ? 'default' : 'outline'}
                onClick={() => setLocale(lang as Locale)}
              >
                <Globe className="w-4 h-4 mr-2" />
                {localeNames[lang as Locale]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Identidad Visual
            </CardTitle>
            <CardDescription>
              Logo y colores de tu institución
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo de la Institución</Label>
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

            {/* Preview */}
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Vista previa:</p>
              <div className="flex items-center gap-4">
                <div
                  className="h-12 px-6 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: formData.colorPrimario }}
                >
                  Botón Primario
                </div>
                <div
                  className="h-12 px-6 rounded-lg flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: formData.colorSecundario }}
                >
                  Botón Secundario
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Colores de Calificaciones */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colores de Calificaciones
            </CardTitle>
            <CardDescription>
              Define los colores según el rango de notas para los reportes PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: gradeColors.excelente }}
                  />
                  Excelente (90-100)
                </Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradeColors.excelente}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, excelente: e.target.value })
                    }
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={gradeColors.excelente}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, excelente: e.target.value })
                    }
                    className="flex-1 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: gradeColors.bueno }}
                  />
                  Bueno (80-89)
                </Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradeColors.bueno}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, bueno: e.target.value })
                    }
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={gradeColors.bueno}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, bueno: e.target.value })
                    }
                    className="flex-1 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: gradeColors.regular }}
                  />
                  Regular (70-79)
                </Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradeColors.regular}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, regular: e.target.value })
                    }
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={gradeColors.regular}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, regular: e.target.value })
                    }
                    className="flex-1 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: gradeColors.deficiente }}
                  />
                  Deficiente (&lt;70)
                </Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={gradeColors.deficiente}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, deficiente: e.target.value })
                    }
                    className="w-10 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={gradeColors.deficiente}
                    onChange={(e) =>
                      setGradeColors({ ...gradeColors, deficiente: e.target.value })
                    }
                    className="flex-1 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensajes y Guardar */}
      {canEdit && (
        <>
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

          <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
