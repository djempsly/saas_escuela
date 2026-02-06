'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { institucionesApi, dominiosApi, adminApi, getMediaUrl } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
  Globe,
  Check,
  X,
  Palette,
  Layout,
  LogIn,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NivelesSelector } from './niveles-selector';

// ==================== TIPOS ====================

interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
      errors?: Array<{ message: string }>;
    };
  };
  message?: string;
}

interface Director {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  institucionId?: string | null;
}

interface Dominio {
  id: string;
  dominio: string;
  verificado: boolean;
  sslActivo: boolean;
  verificadoAt?: string;
  ultimoCheck?: string;
  createdAt: string;
}

interface InstitucionData {
  id: string;
  nombre: string;
  nombreMostrar?: string;
  lema?: string;
  slug: string;
  dominioPersonalizado?: string;
  pais: string;
  sistema: string;
  sistemaEducativo?: string;
  idiomaPrincipal?: string;
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoPosicion?: string;
  faviconUrl?: string;
  fondoLoginUrl?: string;
  colorPrimario: string;
  colorSecundario: string;
  accentColor?: string;
  heroImageUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  loginBgType?: string;
  loginBgColor?: string;
  loginBgGradient?: string;
  loginLogoUrl?: string;
  activo: boolean;
  autogestionActividades: boolean;
  codigoCentro?: string;
  distritoEducativo?: string;
  regionalEducacion?: string;
}

interface InstitucionFormProps {
  mode: 'create' | 'edit';
  institucionId?: string;
  initialData?: InstitucionData;
}

// ==================== CONSTANTES ====================

const PAISES = [
  { value: 'DO', label: 'Republica Dominicana' },
  { value: 'HT', label: 'Haiti' },
];

const SISTEMAS_EDUCATIVOS: Record<string, Array<{ value: string; label: string }>> = {
  DO: [
    { value: 'NIVEL_INICIAL_DO', label: 'Nivel Inicial' },
    { value: 'PRIMARIA_DO', label: 'Primaria' },
    { value: 'SECUNDARIA_GENERAL_DO', label: 'Secundaria General' },
    { value: 'POLITECNICO_DO', label: 'Politecnico' },
  ],
  HT: [
    { value: 'NIVEL_INICIAL_HT', label: 'Niveau Initial' },
    { value: 'PRIMARIA_HT', label: 'Primaire' },
    { value: 'SECUNDARIA_HT', label: 'Secondaire' },
  ],
};

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

const LOGO_POSICIONES = [
  { value: 'left', label: 'Izquierda' },
  { value: 'center', label: 'Centro' },
  { value: 'right', label: 'Derecha' },
];

const LOGIN_BG_TYPES = [
  { value: 'color', label: 'Color sólido' },
  { value: 'image', label: 'Imagen' },
  { value: 'gradient', label: 'Degradado' },
];

const GRADIENT_PRESETS = [
  { value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Púrpura' },
  { value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', label: 'Gris suave' },
  { value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', label: 'Pastel' },
  { value: 'linear-gradient(135deg, #1a365d 0%, #3182ce 100%)', label: 'Azul' },
  { value: 'linear-gradient(135deg, #0f766e 0%, #10b981 100%)', label: 'Verde' },
];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lhams.com';

// ==================== UTILIDADES ====================

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

// ==================== COMPONENTE PRINCIPAL ====================

export function InstitucionForm({ mode, institucionId, initialData }: InstitucionFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  // Estados generales
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('basicos');

  // Estados de archivos
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [loginBgFile, setLoginBgFile] = useState<File | null>(null);
  const [loginBgPreview, setLoginBgPreview] = useState<string | null>(null);
  const [loginLogoFile, setLoginLogoFile] = useState<File | null>(null);
  const [loginLogoPreview, setLoginLogoPreview] = useState<string | null>(null);

  // Validación de slug
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [originalSlug, setOriginalSlug] = useState('');

  // Dominios (solo para edición, en crear se muestran los pendientes)
  const [dominios, setDominios] = useState<Dominio[]>([]);
  const [newDominio, setNewDominio] = useState('');
  const [isAddingDominio, setIsAddingDominio] = useState(false);
  const [verificandoDominio, setVerificandoDominio] = useState<string | null>(null);
  const [pendingDominios, setPendingDominios] = useState<string[]>([]); // Para crear

  // Director (solo para creación)
  const [directores, setDirectores] = useState<Director[]>([]);
  const [loadingDirectores, setLoadingDirectores] = useState(false);
  const [directorMode, setDirectorMode] = useState<'existing' | 'new'>('new');
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('');

  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    nombreMostrar: '',
    lema: '',
    slug: '',
    pais: 'DO' as 'DO' | 'HT',
    sistemaEducativo: 'SECUNDARIA_GENERAL_DO', // Sistema principal (para compatibilidad)
    sistemasEducativos: ['SECUNDARIA_GENERAL_DO'] as string[], // Sistemas seleccionados
    idiomaPrincipal: 'ESPANOL',
    logoPosicion: 'center',
    logoWidth: 120,
    logoHeight: 60,
    colorPrimario: '#1a56db',
    colorSecundario: '#7c3aed',
    accentColor: '#059669',
    heroTitle: '',
    heroSubtitle: '',
    loginBgType: 'color',
    loginBgColor: '#f3f4f6',
    loginBgGradient: '',
    activo: true,
    autogestionActividades: false,
    codigoCentro: '',
    distritoEducativo: '',
    regionalEducacion: '',
    // Director (solo para crear)
    director: {
      nombre: '',
      apellido: '',
      email: '',
    },
  });

  // ==================== EFECTOS ====================

  // Cargar datos en modo edición
  useEffect(() => {
    if (isEditMode && institucionId) {
      fetchInstitucion();
      fetchDominios();
    }
  }, [isEditMode, institucionId]);

  // Cargar directores en modo creación
  useEffect(() => {
    if (!isEditMode) {
      fetchDirectores();
    }
  }, [isEditMode]);

  // Debounce para verificar slug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug && formData.slug !== originalSlug) {
        checkSlugAvailability(formData.slug);
      } else if (formData.slug === originalSlug) {
        setSlugStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.slug, originalSlug]);

  // ==================== FUNCIONES DE CARGA ====================

  const fetchInstitucion = async () => {
    if (!institucionId) return;
    try {
      setIsLoading(true);
      const response = await institucionesApi.getById(institucionId);
      const inst = response.data;

      // Extraer sistemas educativos si están disponibles
      const sistemasFromApi = inst.sistemasEducativos?.map((s: { sistema: string }) => s.sistema) || [];
      const sistemaPrincipal = inst.sistema || inst.sistemaEducativo || 'SECUNDARIA_GENERAL_DO';
      const sistemasEducativos = sistemasFromApi.length > 0 ? sistemasFromApi : [sistemaPrincipal];

      setFormData({
        nombre: inst.nombre || '',
        nombreMostrar: inst.nombreMostrar || '',
        lema: inst.lema || '',
        slug: inst.slug || '',
        pais: inst.pais || 'DO',
        sistemaEducativo: sistemaPrincipal,
        sistemasEducativos,
        idiomaPrincipal: inst.idiomaPrincipal || 'ESPANOL',
        logoPosicion: inst.logoPosicion || 'center',
        logoWidth: inst.logoWidth || 120,
        logoHeight: inst.logoHeight || 60,
        colorPrimario: inst.colorPrimario || '#1a56db',
        colorSecundario: inst.colorSecundario || '#7c3aed',
        accentColor: inst.accentColor || '#059669',
        heroTitle: inst.heroTitle || '',
        heroSubtitle: inst.heroSubtitle || '',
        loginBgType: inst.loginBgType || 'color',
        loginBgColor: inst.loginBgColor || '#f3f4f6',
        loginBgGradient: inst.loginBgGradient || '',
        activo: inst.activo,
        autogestionActividades: inst.autogestionActividades || false,
        codigoCentro: inst.codigoCentro || '',
        distritoEducativo: inst.distritoEducativo || '',
        regionalEducacion: inst.regionalEducacion || '',
        director: { nombre: '', apellido: '', email: '' },
      });

      setLogoPreview(inst.logoUrl ? getMediaUrl(inst.logoUrl) : null);
      setFaviconPreview(inst.faviconUrl ? getMediaUrl(inst.faviconUrl) : null);
      setHeroPreview(inst.heroImageUrl ? getMediaUrl(inst.heroImageUrl) : null);
      setLoginBgPreview(inst.fondoLoginUrl ? getMediaUrl(inst.fondoLoginUrl) : null);
      setLoginLogoPreview(inst.loginLogoUrl ? getMediaUrl(inst.loginLogoUrl) : null);
      setOriginalSlug(inst.slug || '');
    } catch (err) {
      console.error('Error cargando institucion:', err);
      setError('No se pudo cargar la institución');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDominios = async () => {
    if (!institucionId) return;
    try {
      const response = await dominiosApi.getByInstitucion(institucionId);
      setDominios(response.data || []);
    } catch (err) {
      console.error('Error cargando dominios:', err);
    }
  };

  const fetchDirectores = async () => {
    setLoadingDirectores(true);
    try {
      const response = await adminApi.getAllDirectores();
      const data = response.data?.data || [];
      const disponibles = data.filter((d: Director) => !d.institucionId);
      setDirectores(disponibles);
    } catch (err) {
      console.error('Error cargando directores:', err);
    } finally {
      setLoadingDirectores(false);
    }
  };

  // ==================== VALIDACIONES ====================

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    try {
      const response = await institucionesApi.checkSlug(slug, isEditMode ? institucionId : undefined);
      setSlugStatus(response.data.available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, [isEditMode, institucionId]);

  // ==================== HANDLERS ====================

  const handleNombreChange = (nombre: string) => {
    const newSlug = !isEditMode || !originalSlug ? generateSlug(nombre) : formData.slug;
    setFormData({ ...formData, nombre, slug: newSlug });
    if (!isEditMode) {
      setSlugStatus('idle');
    }
  };

  const handlePaisChange = (pais: 'DO' | 'HT') => {
    const defaultSistema = pais === 'DO' ? 'SECUNDARIA_GENERAL_DO' : 'PRIMARIA_HT';
    const defaultIdioma = pais === 'DO' ? 'ESPANOL' : 'KREYOL';
    setFormData({
      ...formData,
      pais,
      sistemaEducativo: defaultSistema,
      sistemasEducativos: [defaultSistema], // Reset con el sistema por defecto
      idiomaPrincipal: defaultIdioma,
    });
  };

  const handleSistemasChange = (sistemas: string[]) => {
    // El sistema principal será el primero de la lista
    const sistemaPrincipal = sistemas[0] || formData.sistemaEducativo;
    setFormData({
      ...formData,
      sistemasEducativos: sistemas,
      sistemaEducativo: sistemaPrincipal,
    });
  };

  // Dominios
  const handleAddDominio = async () => {
    if (!newDominio.trim()) return;

    if (isEditMode && institucionId) {
      // En modo edición, agregar directamente
      setIsAddingDominio(true);
      try {
        const response = await dominiosApi.create(newDominio.trim(), institucionId);
        setDominios([...dominios, response.data.dominio]);
        setNewDominio('');
        setSuccess('Dominio agregado. Configura el DNS según las instrucciones.');
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.response?.data?.error || 'Error al agregar dominio');
      } finally {
        setIsAddingDominio(false);
      }
    } else {
      // En modo crear, agregar a pendientes
      if (!pendingDominios.includes(newDominio.trim())) {
        setPendingDominios([...pendingDominios, newDominio.trim()]);
      }
      setNewDominio('');
    }
  };

  const handleRemovePendingDominio = (dominio: string) => {
    setPendingDominios(pendingDominios.filter(d => d !== dominio));
  };

  const handleVerificarDominio = async (dominioId: string) => {
    setVerificandoDominio(dominioId);
    try {
      const response = await dominiosApi.verificar(dominioId);
      setDominios(dominios.map(d =>
        d.id === dominioId ? { ...d, ...response.data } : d
      ));
      if (response.data.verificado) {
        setSuccess('Dominio verificado correctamente');
      } else {
        setError('El dominio aún no apunta a nuestro servidor');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || 'Error al verificar dominio');
    } finally {
      setVerificandoDominio(null);
    }
  };

  const handleDeleteDominio = async (dominioId: string) => {
    if (!confirm('¿Estás seguro de eliminar este dominio?')) return;

    try {
      await dominiosApi.delete(dominioId);
      setDominios(dominios.filter(d => d.id !== dominioId));
      setSuccess('Dominio eliminado');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error || 'Error al eliminar dominio');
    }
  };

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    if (slugStatus === 'taken') {
      setError('El slug ya está en uso por otra institución');
      setIsSaving(false);
      return;
    }

    try {
      if (isEditMode && institucionId) {
        // ========== MODO EDICIÓN ==========

        // Validar que hay al menos un sistema educativo seleccionado
        if (formData.sistemasEducativos.length === 0) {
          setError('Debe seleccionar al menos un nivel educativo');
          setIsSaving(false);
          return;
        }

        await institucionesApi.updateSensitive(institucionId, {
          nombre: formData.nombre,
          nombreMostrar: formData.nombreMostrar || null,
          slug: formData.slug,
          idiomaPrincipal: formData.idiomaPrincipal,
          logoPosicion: formData.logoPosicion,
          logoWidth: formData.logoWidth,
          logoHeight: formData.logoHeight,
          activo: formData.activo,
          autogestionActividades: formData.autogestionActividades,
          heroTitle: formData.heroTitle || null,
          heroSubtitle: formData.heroSubtitle || null,
          loginBgType: formData.loginBgType,
          loginBgColor: formData.loginBgColor,
          loginBgGradient: formData.loginBgGradient || null,
        });

        // Actualizar sistemas educativos
        await institucionesApi.updateSistemasEducativos(institucionId, formData.sistemasEducativos);

        const configData = new FormData();
        configData.append('colorPrimario', formData.colorPrimario);
        configData.append('colorSecundario', formData.colorSecundario);
        configData.append('accentColor', formData.accentColor);
        if (formData.lema) configData.append('lema', formData.lema);
        if (logoFile) configData.append('logo', logoFile);
        if (loginBgFile) configData.append('fondoLogin', loginBgFile);

        await institucionesApi.updateConfig(institucionId, configData);

        if (faviconFile) await institucionesApi.uploadFavicon(institucionId, faviconFile);
        if (heroFile) await institucionesApi.uploadHeroImage(institucionId, heroFile);
        if (loginLogoFile) await institucionesApi.uploadLoginLogo(institucionId, loginLogoFile);

        setSuccess('Institución actualizada correctamente');
        setOriginalSlug(formData.slug);

        setTimeout(() => {
          router.push(`/dashboard/admin/instituciones/${institucionId}`);
        }, 2000);

      } else {
        // ========== MODO CREACIÓN ==========

        // Validar director
        if (directorMode === 'existing' && !selectedDirectorId) {
          setError('Debe seleccionar un director existente');
          setIsSaving(false);
          return;
        }
        if (directorMode === 'new' && (!formData.director.nombre || !formData.director.apellido)) {
          setError('Debe ingresar nombre y apellido del nuevo director');
          setIsSaving(false);
          return;
        }

        // Validar que hay al menos un sistema educativo seleccionado
        if (formData.sistemasEducativos.length === 0) {
          setError('Debe seleccionar al menos un nivel educativo');
          setIsSaving(false);
          return;
        }

        // Construir payload
        const payload: Record<string, unknown> = {
          nombre: formData.nombre,
          pais: formData.pais,
          sistemaEducativo: formData.sistemaEducativo, // Sistema principal para compatibilidad
          sistemasEducativos: formData.sistemasEducativos, // Todos los sistemas seleccionados
          idiomaPrincipal: formData.idiomaPrincipal,
          autogestionActividades: formData.autogestionActividades,
          colores: {
            primario: formData.colorPrimario,
            secundario: formData.colorSecundario,
          },
        };

        if (formData.slug) payload.slug = formData.slug;
        if (formData.nombreMostrar) payload.nombreMostrar = formData.nombreMostrar;
        if (formData.lema) payload.lema = formData.lema;
        if (formData.accentColor) payload.accentColor = formData.accentColor;
        if (formData.heroTitle) payload.heroTitle = formData.heroTitle;
        if (formData.heroSubtitle) payload.heroSubtitle = formData.heroSubtitle;
        if (formData.loginBgType) payload.loginBgType = formData.loginBgType;
        if (formData.loginBgColor) payload.loginBgColor = formData.loginBgColor;
        if (formData.loginBgGradient) payload.loginBgGradient = formData.loginBgGradient;
        if (formData.logoPosicion) payload.logoPosicion = formData.logoPosicion;
        if (formData.logoWidth) payload.logoWidth = formData.logoWidth;
        if (formData.logoHeight) payload.logoHeight = formData.logoHeight;

        if (directorMode === 'existing') {
          payload.directorId = selectedDirectorId;
        } else {
          const directorData: Record<string, string> = {
            nombre: formData.director.nombre,
            apellido: formData.director.apellido,
          };
          if (formData.director.email) {
            directorData.email = formData.director.email;
          }
          payload.director = directorData;
        }

        // Crear institución
        const response = await institucionesApi.createJson(payload);
        const newId = response.data?.data?.institucion?.id;

        if (newId) {
          // Subir imágenes
          if (logoFile) {
            const logoData = new FormData();
            logoData.append('logo', logoFile);
            await institucionesApi.updateConfig(newId, logoData);
          }
          if (faviconFile) await institucionesApi.uploadFavicon(newId, faviconFile);
          if (heroFile) await institucionesApi.uploadHeroImage(newId, heroFile);
          if (loginBgFile) {
            const bgData = new FormData();
            bgData.append('fondoLogin', loginBgFile);
            await institucionesApi.updateConfig(newId, bgData);
          }
          if (loginLogoFile) await institucionesApi.uploadLoginLogo(newId, loginLogoFile);

          // Registrar dominios pendientes
          for (const dominio of pendingDominios) {
            try {
              await dominiosApi.create(dominio, newId);
            } catch (err) {
              console.error('Error registrando dominio:', dominio, err);
            }
          }
        }

        // Mostrar contraseña temporal
        if (response.data?.data?.tempPassword) {
          alert(
            `Institución creada exitosamente.\n\n` +
            `Contraseña temporal del director: ${response.data.data.tempPassword}\n\n` +
            `Guárdela en un lugar seguro.`
          );
        } else {
          alert('Institución creada exitosamente.');
        }

        router.push('/dashboard/admin/instituciones');
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Error:', err);

      let errorMsg = isEditMode ? 'Error al actualizar la institución' : 'Error al crear la institución';

      if (apiError.response?.data) {
        if (apiError.response.data.errors && Array.isArray(apiError.response.data.errors)) {
          errorMsg = apiError.response.data.errors.map((e) => e.message).join(', ');
        } else if (apiError.response.data.message) {
          errorMsg = apiError.response.data.message;
        } else if (apiError.response.data.error) {
          errorMsg = apiError.response.data.error;
        }
      } else if (apiError.message) {
        errorMsg = apiError.message;
      }

      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== RENDER ====================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isEditMode && error && !formData.nombre) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">Institución no encontrada</h2>
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

  const backUrl = isEditMode && institucionId
    ? `/dashboard/admin/instituciones/${institucionId}`
    : '/dashboard/admin/instituciones';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditMode ? 'Editar Institución' : 'Nueva Institución'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? formData.nombre : 'Registra una nueva institución educativa'}
          </p>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basicos" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Datos</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="landing" className="flex items-center gap-2">
              <Layout className="w-4 h-4" />
              <span className="hidden sm:inline">Landing</span>
            </TabsTrigger>
            <TabsTrigger value="login" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Login</span>
            </TabsTrigger>
            <TabsTrigger value="dominios" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Dominios</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== TAB 1: DATOS BÁSICOS ==================== */}
          <TabsContent value="basicos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Institución</CardTitle>
                <CardDescription>Datos principales de identificación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Oficial *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => handleNombreChange(e.target.value)}
                      placeholder="Ej: Colegio San José"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreMostrar">Nombre a Mostrar</Label>
                    <Input
                      id="nombreMostrar"
                      value={formData.nombreMostrar}
                      onChange={(e) => setFormData({ ...formData, nombreMostrar: e.target.value })}
                      placeholder="Nombre corto para la UI"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si está vacío, se usa el nombre oficial
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lema">Lema (opcional)</Label>
                  <Input
                    id="lema"
                    value={formData.lema}
                    onChange={(e) => setFormData({ ...formData, lema: e.target.value })}
                    placeholder="Formando líderes del mañana..."
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                        placeholder="colegio-san-jose"
                        required
                        className="pr-10"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {slugStatus === 'available' && <Check className="w-4 h-4 text-green-600" />}
                        {slugStatus === 'taken' && <X className="w-4 h-4 text-red-600" />}
                      </div>
                    </div>
                    {slugStatus === 'taken' && (
                      <p className="text-xs text-red-600">Este slug ya está en uso</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Acceso: {formData.slug || 'slug'}.{BASE_DOMAIN}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idioma">Idioma Principal</Label>
                    <select
                      id="idioma"
                      value={formData.idiomaPrincipal}
                      onChange={(e) => setFormData({ ...formData, idiomaPrincipal: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {(IDIOMAS_POR_PAIS[formData.pais] || IDIOMAS_POR_PAIS['DO']).map((i) => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* País - solo en crear */}
                {!isEditMode && (
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
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Selector de Niveles Educativos - solo en crear */}
                {!isEditMode && (
                  <div className="pt-4 border-t">
                    <NivelesSelector
                      pais={formData.pais}
                      selectedSistemas={formData.sistemasEducativos}
                      onChange={handleSistemasChange}
                      primaryColor={formData.colorPrimario}
                    />
                  </div>
                )}

                {/* Configuración */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Configuración</h3>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Label>Institución Activa</Label>
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
                      <Label>Autogestión de Actividades</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite al director crear actividades en la landing
                      </p>
                    </div>
                    <Switch
                      checked={formData.autogestionActividades}
                      onCheckedChange={(checked) => setFormData({ ...formData, autogestionActividades: checked })}
                    />
                  </div>
                </div>

                {/* Niveles educativos - solo en edición */}
                {isEditMode && (
                  <div className="pt-4 border-t">
                    <NivelesSelector
                      pais={formData.pais}
                      selectedSistemas={formData.sistemasEducativos}
                      onChange={handleSistemasChange}
                      primaryColor={formData.colorPrimario}
                    />
                    <p className="text-xs text-amber-600 mt-2">
                      Nota: Modificar los niveles educativos puede afectar la estructura académica existente.
                    </p>
                  </div>
                )}

                {/* Datos ministeriales */}
                {isEditMode && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">Datos Ministeriales (opcional)</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="codigoCentro">Código de Centro</Label>
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
                        <Label htmlFor="regionalEducacion">Regional de Educación</Label>
                        <Input
                          id="regionalEducacion"
                          value={formData.regionalEducacion}
                          onChange={(e) => setFormData({ ...formData, regionalEducacion: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Director - solo en modo crear */}
            {!isEditMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Director/a de la Institución</CardTitle>
                  <CardDescription>
                    Selecciona un director existente o crea uno nuevo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                          No hay directores disponibles.
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
                        <Select value={selectedDirectorId} onValueChange={setSelectedDirectorId}>
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
                          Correo Electrónico
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
                          Si se proporciona, se enviará la contraseña temporal a este correo.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==================== TAB 2: BRANDING ==================== */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidad Visual</CardTitle>
                <CardDescription>Logo, favicon y colores de la institución</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <Label>Logo de la Institución</Label>
                    <div className="w-40 h-40">
                      <ImageUpload
                        value={logoPreview || undefined}
                        onChange={(file, preview) => { setLogoFile(file); setLogoPreview(preview); }}
                        placeholder="Subir logo"
                        aspectRatio="square"
                        maxSizeMB={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Ancho (px)</Label>
                        <Input
                          type="number"
                          value={formData.logoWidth}
                          onChange={(e) => setFormData({ ...formData, logoWidth: parseInt(e.target.value) || 120 })}
                          min={40}
                          max={300}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Alto (px)</Label>
                        <Input
                          type="number"
                          value={formData.logoHeight}
                          onChange={(e) => setFormData({ ...formData, logoHeight: parseInt(e.target.value) || 60 })}
                          min={40}
                          max={200}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Favicon</Label>
                    <div className="w-20 h-20">
                      <ImageUpload
                        value={faviconPreview || undefined}
                        onChange={(file, preview) => { setFaviconFile(file); setFaviconPreview(preview); }}
                        placeholder="Subir"
                        aspectRatio="square"
                        maxSizeMB={1}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Icono pequeño en la pestaña del navegador. Recomendado: 32x32 o 64x64 px.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Posición del Logo en Landing</Label>
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
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Paleta de Colores</h3>
                  <div className="grid gap-4 md:grid-cols-3">
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
                    <div className="space-y-2">
                      <Label htmlFor="accentColor">Color de Acento</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          id="accentColor"
                          value={formData.accentColor}
                          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={formData.accentColor}
                          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-3">Preview de colores:</p>
                    <div className="flex gap-2 items-center">
                      <div
                        className="px-4 py-2 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: formData.colorPrimario }}
                      >
                        Primario
                      </div>
                      <div
                        className="px-4 py-2 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: formData.colorSecundario }}
                      >
                        Secundario
                      </div>
                      <div
                        className="px-4 py-2 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: formData.accentColor }}
                      >
                        Acento
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 3: LANDING PAGE ==================== */}
          <TabsContent value="landing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Landing Page</CardTitle>
                <CardDescription>Personaliza la página principal que ven los visitantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Imagen Principal (Hero)</Label>
                  <div className="w-full h-48">
                    <ImageUpload
                      value={heroPreview || undefined}
                      onChange={(file, preview) => { setHeroFile(file); setHeroPreview(preview); }}
                      placeholder="Subir imagen hero"
                      aspectRatio="banner"
                      maxSizeMB={5}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Imagen principal del landing. Recomendado: 1920x800 px mínimo.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Título del Hero</Label>
                    <Input
                      id="heroTitle"
                      value={formData.heroTitle}
                      onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                      placeholder={formData.nombre || 'Nombre de la institución'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si está vacío, se usa el nombre de la institución
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Subtítulo del Hero</Label>
                    <Input
                      id="heroSubtitle"
                      value={formData.heroSubtitle}
                      onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                      placeholder="Bienvenidos a nuestra plataforma educativa"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Preview del Hero</Label>
                  <div
                    className="relative rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      backgroundColor: formData.colorPrimario,
                      backgroundImage: heroPreview ? `url(${heroPreview})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      minHeight: '280px',
                      aspectRatio: '16/7',
                    }}
                  >
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative text-center text-white p-6">
                      <h2 className="text-3xl font-bold mb-3">
                        {formData.heroTitle || formData.nombre || 'Nombre de la Institución'}
                      </h2>
                      <p className="text-white/80 text-lg">
                        {formData.heroSubtitle || 'Bienvenidos a nuestra plataforma educativa'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 4: PÁGINA DE LOGIN ==================== */}
          <TabsContent value="login" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de la Página de Login</CardTitle>
                <CardDescription>Personaliza el fondo y apariencia del login</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo de Fondo</Label>
                  <div className="flex gap-2">
                    {LOGIN_BG_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, loginBgType: type.value })}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                          formData.loginBgType === type.value
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.loginBgType === 'color' && (
                  <div className="space-y-2">
                    <Label htmlFor="loginBgColor">Color de Fondo</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="loginBgColor"
                        value={formData.loginBgColor}
                        onChange={(e) => setFormData({ ...formData, loginBgColor: e.target.value })}
                        className="w-12 h-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={formData.loginBgColor}
                        onChange={(e) => setFormData({ ...formData, loginBgColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}

                {formData.loginBgType === 'image' && (
                  <div className="space-y-4">
                    <Label>Imagen de Fondo</Label>
                    <div className="w-full h-40">
                      <ImageUpload
                        value={loginBgPreview || undefined}
                        onChange={(file, preview) => { setLoginBgFile(file); setLoginBgPreview(preview); }}
                        placeholder="Subir imagen de fondo"
                        aspectRatio="banner"
                        maxSizeMB={5}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recomendado: 1920x1080 px mínimo.
                    </p>
                  </div>
                )}

                {formData.loginBgType === 'gradient' && (
                  <div className="space-y-4">
                    <Label>Degradado (CSS Gradient)</Label>
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
                      {GRADIENT_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, loginBgGradient: preset.value })}
                          className={`h-16 rounded-lg border-2 transition-colors ${
                            formData.loginBgGradient === preset.value
                              ? 'border-primary ring-2 ring-primary ring-offset-2'
                              : 'border-transparent'
                          }`}
                          style={{ background: preset.value }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                    <Input
                      value={formData.loginBgGradient}
                      onChange={(e) => setFormData({ ...formData, loginBgGradient: e.target.value })}
                      placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    />
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <Label>Logo Específico para Login</Label>
                  <div className="w-40 h-20">
                    <ImageUpload
                      value={loginLogoPreview || undefined}
                      onChange={(file, preview) => { setLoginLogoFile(file); setLoginLogoPreview(preview); }}
                      placeholder="Logo del login"
                      aspectRatio="banner"
                      maxSizeMB={2}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Si está vacío, se usa el logo principal de la institución
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Preview de la Página de Login</Label>
                  <div
                    className="relative h-64 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{
                      backgroundColor: formData.loginBgType === 'color' ? formData.loginBgColor : undefined,
                      backgroundImage:
                        formData.loginBgType === 'image' && loginBgPreview
                          ? `url(${loginBgPreview})`
                          : formData.loginBgType === 'gradient'
                          ? formData.loginBgGradient
                          : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="bg-white p-6 rounded-lg shadow-xl w-64">
                      <div className="flex justify-center mb-4">
                        {(loginLogoPreview || logoPreview) ? (
                          <Image
                            src={loginLogoPreview || logoPreview || ''}
                            alt="Logo"
                            width={100}
                            height={50}
                            className="object-contain"
                          />
                        ) : (
                          <Building2 className="w-12 h-12 text-slate-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="h-8 bg-slate-100 rounded" />
                        <div className="h-8 bg-slate-100 rounded" />
                        <div
                          className="h-8 rounded text-white text-sm flex items-center justify-center"
                          style={{ backgroundColor: formData.colorPrimario }}
                        >
                          Iniciar Sesión
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== TAB 5: DOMINIOS ==================== */}
          <TabsContent value="dominios" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Dominios</CardTitle>
                <CardDescription>Configura los dominios de acceso a la institución</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Subdominio automático */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Subdominio Automático</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Siempre disponible, se genera del slug
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1 bg-white rounded border text-sm">
                        {formData.slug || 'slug'}.{BASE_DOMAIN}
                      </code>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Agregar nuevo dominio */}
                <div className="space-y-4">
                  <Label>Agregar Dominio Personalizado</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newDominio}
                      onChange={(e) => setNewDominio(e.target.value)}
                      placeholder="miescuela.edu.do"
                      disabled={isAddingDominio}
                    />
                    <Button
                      type="button"
                      onClick={handleAddDominio}
                      disabled={isAddingDominio || !newDominio.trim()}
                    >
                      {isAddingDominio ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {!isEditMode && (
                    <p className="text-xs text-muted-foreground">
                      Los dominios se registrarán después de crear la institución
                    </p>
                  )}
                </div>

                {/* Dominios pendientes (solo en modo crear) */}
                {!isEditMode && pendingDominios.length > 0 && (
                  <div className="space-y-3">
                    <Label>Dominios a Registrar</Label>
                    {pendingDominios.map((dominio) => (
                      <div
                        key={dominio}
                        className="p-4 rounded-lg border bg-blue-50 border-blue-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{dominio}</p>
                            <p className="text-xs text-muted-foreground">
                              Se registrará al crear la institución
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleRemovePendingDominio(dominio)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Lista de dominios existentes (solo en modo editar) */}
                {isEditMode && dominios.length > 0 && (
                  <div className="space-y-3">
                    <Label>Dominios Registrados</Label>
                    {dominios.map((dominio) => (
                      <div
                        key={dominio.id}
                        className={`p-4 rounded-lg border ${
                          dominio.verificado
                            ? 'bg-green-50 border-green-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {dominio.verificado ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-600" />
                            )}
                            <div>
                              <p className="font-medium">{dominio.dominio}</p>
                              <p className="text-xs text-muted-foreground">
                                {dominio.verificado
                                  ? `Verificado • SSL ${dominio.sslActivo ? 'activo' : 'pendiente'}`
                                  : 'Pendiente de verificación DNS'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {dominio.verificado && (
                              <a
                                href={`https://${dominio.dominio}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button type="button" variant="ghost" size="icon" title="Abrir sitio">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                            {!dominio.verificado && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVerificarDominio(dominio.id)}
                                disabled={verificandoDominio === dominio.id}
                                title="Verificar ahora"
                              >
                                {verificandoDominio === dominio.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteDominio(dominio.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {!dominio.verificado && (
                          <div className="mt-4 p-3 bg-white rounded border text-sm">
                            <p className="font-medium mb-2">Configura el DNS de tu dominio:</p>
                            <div className="grid gap-2 text-xs font-mono">
                              <div className="flex gap-4">
                                <span className="text-muted-foreground w-16">Tipo:</span>
                                <span>A</span>
                              </div>
                              <div className="flex gap-4">
                                <span className="text-muted-foreground w-16">Nombre:</span>
                                <span>@</span>
                              </div>
                              <div className="flex gap-4">
                                <span className="text-muted-foreground w-16">Valor:</span>
                                <span>[IP del servidor]</span>
                              </div>
                            </div>
                            <p className="mt-2 text-muted-foreground">
                              Los cambios de DNS pueden tardar hasta 48 horas.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isEditMode && dominios.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2" />
                    <p>No hay dominios personalizados configurados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botón de guardar */}
        <div className="flex gap-4 pt-6">
          <Link href={backUrl} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Guardar Cambios' : 'Crear Institución'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
