'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { estudiantesApi, usersApi, nivelesApi } from '@/lib/api';
import { Users, Search, Loader2, Eye, FileText, Plus, X, Save, EyeOff, Copy, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  username: string;
  debeCambiarPassword?: boolean;
  passwordTemporal?: string | null;
  inscripciones?: {
    clase: {
      nivel: {
        id: string;
        nombre: string;
      };
    };
  }[];
}

interface Nivel {
  id: string;
  nombre: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function EstudiantesPage() {
  const { user } = useAuthStore();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [selectedNivel, setSelectedNivel] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
  });
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const canSeePasswords = user?.role === 'ADMIN' || user?.role === 'DIRECTOR';

  const togglePasswordVisibility = (estId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(estId)) {
        newSet.delete(estId);
      } else {
        newSet.add(estId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('¿Generar nueva contraseña temporal para este estudiante?')) return;
    try {
      const response = await usersApi.resetPasswordManual(userId);
      alert(`Nueva contraseña temporal: ${response.data.tempPassword}`);
      fetchEstudiantes(); // Recargar para obtener la nueva contraseña
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al resetear contraseña');
    }
  };

  useEffect(() => {
    fetchEstudiantes();
  }, []);

  const fetchEstudiantes = async () => {
    try {
      const [estRes, nivRes] = await Promise.all([
        estudiantesApi.getAll(),
        nivelesApi.getAll(),
      ]);
      setEstudiantes(estRes.data.data || estRes.data || []);
      setNiveles(nivRes.data.data || nivRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await usersApi.create({
        ...formData,
        rol: 'ESTUDIANTE',
      });
      const createdUser = response.data.data?.user;
      const tempPassword = response.data.data?.tempPassword;

      setCreatedCredentials({
        username: createdUser?.username || '',
        password: tempPassword || '',
      });
      setEstudiantes([createdUser, ...estudiantes]);
      setFormData({ nombre: '', apellido: '', email: '' });
      setShowModal(false);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al registrar estudiante');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', apellido: '', email: '' });
    setShowModal(false);
  };

  const filtered = useMemo(() => {
    return estudiantes.filter((e) => {
      const matchesSearch =
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.username.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesNivel =
        selectedNivel === 'all' ||
        e.inscripciones?.some((ins) => ins.clase.nivel.id === selectedNivel);

      return matchesSearch && matchesNivel;
    });
  }, [estudiantes, searchTerm, selectedNivel]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Estudiantes</h1>
          <p className="text-muted-foreground">Lista de estudiantes de la institución</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Estudiante
        </Button>
      </div>

      {/* Credenciales del estudiante creado */}
      {createdCredentials && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium text-green-800">Estudiante registrado exitosamente</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    Usuario: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{createdCredentials.username}</strong>
                  </p>
                  <p>
                    Contraseña temporal: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{createdCredentials.password}</strong>
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Guarda estas credenciales. El estudiante deberá cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCreatedCredentials(null)}>
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar estudiante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap hidden md:block">Filtrar por Nivel:</Label>
              <select
                value={selectedNivel}
                onChange={(e) => setSelectedNivel(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">Todos los niveles</option>
                {niveles.map((nivel) => (
                  <option key={nivel.id} value={nivel.id}>
                    {nivel.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((est) => {
            // Obtener el nombre del nivel si tiene inscripciones
            const nivelName = est.inscripciones?.[0]?.clase.nivel.nombre;

            return (
              <Card key={est.id}>
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                      {est.nombre[0]}{est.apellido[0]}
                    </div>
                    <div>
                      <p className="font-medium">{est.nombre} {est.apellido}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">@{est.username}</p>
                        {nivelName && (
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                            {nivelName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    {/* Contraseña temporal - solo visible para ADMIN/DIRECTOR */}
                    {canSeePasswords && est.passwordTemporal && (
                      <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                        <span className="text-xs text-yellow-700">
                          {visiblePasswords.has(est.id) ? est.passwordTemporal : '******'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(est.id)}
                          title={visiblePasswords.has(est.id) ? 'Ocultar' : 'Ver contraseña'}
                        >
                          {visiblePasswords.has(est.id) ? (
                            <EyeOff className="w-3 h-3 text-yellow-600" />
                          ) : (
                            <Eye className="w-3 h-3 text-yellow-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(est.passwordTemporal!)}
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3 text-yellow-600" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {canSeePasswords && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResetPassword(est.id)}
                          title="Resetear contraseña"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      )}
                      <Link href={`/dashboard/estudiantes/${est.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                      </Link>
                      <Link href={`/dashboard/estudiantes/${est.id}/boletin`}>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" /> Boletín
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Registro */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Registrar Nuevo Estudiante</h2>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Nombre"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                      placeholder="Apellido"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="estudiante@ejemplo.com"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                  <p className="font-medium">Formato del usuario generado:</p>
                  <p className="text-xs mt-1">
                    nombre.apellido + 4 dígitos (ej: {formData.nombre.toLowerCase() || 'juan'}.{formData.apellido.toLowerCase() || 'perez'}1234)
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetForm}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Registrar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
