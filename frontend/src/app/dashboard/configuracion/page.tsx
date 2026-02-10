'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { institucionesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { useI18nStore, localeNames, Locale } from '@/lib/i18n';
import {
  Palette,
  Globe,
  Save,
  Loader2,
  Languages,
  GraduationCap,
} from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const LANGUAGES_BY_COUNTRY: Record<string, Array<{ code: Locale; label: string }>> = {
  DO: [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
  ],
  HT: [
    { code: 'ht', label: 'Kreyòl' },
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
  ],
};

export default function ConfiguracionPage() {
  const { user } = useAuthStore();
  const { branding, setBranding } = useInstitutionStore();
  const { locale, setLocale } = useI18nStore();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    colorPrimario: branding?.colorPrimario || '#1a365d',
    colorSecundario: branding?.colorSecundario || '#3182ce',
  });

  const GRADOS = [
    { num: 1, label: '1ro' },
    { num: 2, label: '2do' },
    { num: 3, label: '3ro' },
    { num: 4, label: '4to' },
    { num: 5, label: '5to' },
    { num: 6, label: '6to' },
  ];

  const [gradoColores, setGradoColores] = useState<Record<number, string>>({
    1: '#2563eb',
    2: '#16a34a',
    3: '#9333ea',
    4: '#dc2626',
    5: '#ea580c',
    6: '#0891b2',
  });

  const [gradoSombras, setGradoSombras] = useState<Record<number, string>>({
    1: '#1e40af',
    2: '#166534',
    3: '#6b21a8',
    4: '#991b1b',
    5: '#c2410c',
    6: '#0e7490',
  });

  const [franjaColores, setFranjaColores] = useState<Record<number, string>>({
    1: '#2563eb',
    2: '#16a34a',
    3: '#9333ea',
    4: '#dc2626',
    5: '#ea580c',
    6: '#0891b2',
  });

  // Cargar colores de sabana guardados
  useEffect(() => {
    const loadSabanaColores = async () => {
      if (user?.institucionId) {
        try {
          const response = await institucionesApi.getBranding(user.institucionId);
          const saved = response.data?.sabanaColores as { colores?: Record<string, string>; sombras?: Record<string, string>; franja?: Record<string, string> } | null;
          if (saved?.colores) {
            setGradoColores(prev => {
              const updated = { ...prev };
              Object.entries(saved.colores!).forEach(([k, v]) => { updated[Number(k)] = v; });
              return updated;
            });
          }
          if (saved?.sombras) {
            setGradoSombras(prev => {
              const updated = { ...prev };
              Object.entries(saved.sombras!).forEach(([k, v]) => { updated[Number(k)] = v; });
              return updated;
            });
          }
          if (saved?.franja) {
            setFranjaColores(prev => {
              const updated = { ...prev };
              Object.entries(saved.franja!).forEach(([k, v]) => { updated[Number(k)] = v; });
              return updated;
            });
          }
        } catch (error) {
          console.error('Error loading sabana colores:', error);
        }
      }
    };
    loadSabanaColores();
  }, [user?.institucionId]);

  // Determinar idiomas según país de la institución
  const pais = branding?.pais || 'DO';
  const availableLanguages = LANGUAGES_BY_COUNTRY[pais] || LANGUAGES_BY_COUNTRY['DO'];

  const handleSave = async () => {
    if (!user?.institucionId) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await institucionesApi.updateDirectorConfig(user.institucionId, {
        colorPrimario: formData.colorPrimario,
        colorSecundario: formData.colorSecundario,
        sabanaColores: JSON.stringify({
          colores: gradoColores,
          sombras: gradoSombras,
          franja: franjaColores,
        }),
      });

      // Actualizar branding local
      setBranding({
        ...branding!,
        colorPrimario: formData.colorPrimario,
        colorSecundario: formData.colorSecundario,
      });

      setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al guardar la configuración',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = ['ADMIN', 'DIRECTOR'].includes(user?.role || '');

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza la apariencia y preferencias de tu institución
        </p>
      </div>

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
                key={lang.code}
                variant={locale === lang.code ? 'default' : 'outline'}
                onClick={() => setLocale(lang.code)}
              >
                <Globe className="w-4 h-4 mr-2" />
                {localeNames[lang.code]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Colores */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Colores de la Institución
            </CardTitle>
            <CardDescription>
              Personaliza los colores del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

      {/* Colores de Sabana por Grado */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Colores de Sabana por Grado
            </CardTitle>
            <CardDescription>
              Elige el color de la franja lateral de la sabana de notas para cada grado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {GRADOS.map((grado) => (
                <div key={grado.num} className="space-y-3">
                  <Label className="text-center block font-semibold">{grado.label} Grado</Label>
                  <div className="flex flex-col items-center gap-2">
                    {/* Preview del número con sombra */}
                    <div
                      className="w-14 h-14 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: gradoColores[grado.num] }}
                    >
                      <span
                        className="text-white text-2xl font-black"
                        style={{ textShadow: `2px 2px 4px ${gradoSombras[grado.num]}` }}
                      >
                        {grado.num}
                      </span>
                    </div>
                    {/* Color principal */}
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={gradoColores[grado.num]}
                        onChange={(e) =>
                          setGradoColores({ ...gradoColores, [grado.num]: e.target.value })
                        }
                        className="w-8 h-7 rounded border cursor-pointer"
                      />
                      <span className="text-[10px] text-muted-foreground">Color</span>
                    </div>
                    {/* Color sombra */}
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={gradoSombras[grado.num]}
                        onChange={(e) =>
                          setGradoSombras({ ...gradoSombras, [grado.num]: e.target.value })
                        }
                        className="w-8 h-7 rounded border cursor-pointer"
                      />
                      <span className="text-[10px] text-muted-foreground">Sombra</span>
                    </div>
                    {/* Color franja Lado B */}
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={franjaColores[grado.num]}
                        onChange={(e) =>
                          setFranjaColores({ ...franjaColores, [grado.num]: e.target.value })
                        }
                        className="w-8 h-7 rounded border cursor-pointer"
                      />
                      <span className="text-[10px] text-muted-foreground">Franja</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Preview de franjas */}
            <div className="mt-4 p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Vista previa de franjas:</p>
              <div className="flex gap-3 items-end">
                {GRADOS.map((grado) => (
                  <div key={grado.num} className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-20 rounded-sm flex items-center justify-center"
                      style={{ backgroundColor: gradoColores[grado.num] }}
                    >
                      <span
                        className="text-white text-lg font-black"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)',
                          textShadow: `2px 2px 4px ${gradoSombras[grado.num]}`,
                        }}
                      >
                        {grado.num}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{grado.label}</span>
                  </div>
                ))}
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
