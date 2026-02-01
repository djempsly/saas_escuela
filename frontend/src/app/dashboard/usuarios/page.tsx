'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi, ROLES } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  KeyRound,
  UserCheck,
  UserX,
} from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  username: string;
  role: string;
  activo: boolean;
  createdAt: string;
}

const ROLES_DISPLAY: Record<string, string> = {
  ADMIN: 'Administrador',
  DIRECTOR: 'Director',
  COORDINADOR: 'Coordinador',
  COORDINADOR_ACADEMICO: 'Coord. Académico',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
  SECRETARIA: 'Secretaria',
};

const ROLES_CREABLES = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'SECRETARIA', label: 'Secretaria' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'COORDINADOR_ACADEMICO', label: 'Coordinador Académico' },
];

export default function UsuariosPage() {
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    nombre: '',
    apellido: '',
    email: '',
    rol: 'ESTUDIANTE',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [createdUsername, setCreatedUsername] = useState('');

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await usersApi.getAll();
      setUsuarios(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await usersApi.create(newUser);
      const createdUser = response.data.data?.user;
      setTempPassword(response.data.data?.tempPassword || '');
      setCreatedUsername(createdUser?.username || '');
      setUsuarios([createdUser, ...usuarios]);
      setNewUser({ nombre: '', apellido: '', email: '', rol: 'ESTUDIANTE' });
      setShowModal(false);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al crear usuario');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('¿Generar nueva contraseña temporal para este usuario?')) return;

    try {
      const response = await usersApi.resetPasswordManual(userId);
      alert(`Nueva contraseña temporal: ${response.data.tempPassword}`);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al resetear contraseña');
    }
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const matchSearch =
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios de tu institución
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border rounded-md w-full md:w-48"
            >
              <option value="">Todos los roles</option>
              {Object.entries(ROLES_DISPLAY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Credenciales del usuario creado */}
      {tempPassword && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium text-green-800">Usuario creado exitosamente</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    Usuario: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{createdUsername}</strong>
                  </p>
                  <p>
                    Contraseña temporal: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{tempPassword}</strong>
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Guarda estas credenciales. El usuario deberá cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setTempPassword(''); setCreatedUsername(''); }}>
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuarios */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUsuarios.length > 0 ? (
            filteredUsuarios.map((u) => (
              <Card key={u.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        u.activo ? 'bg-primary' : 'bg-slate-400'
                      }`}
                    >
                      {u.nombre[0]}{u.apellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {u.nombre} {u.apellido}
                        </p>
                        {!u.activo && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>@{u.username}</span>
                        {u.email && <span>• {u.email}</span>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                      {ROLES_DISPLAY[u.role] || u.role}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResetPassword(u.id)}
                        title="Resetear contraseña"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay usuarios</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterRole
                    ? 'No se encontraron resultados'
                    : 'Comienza creando tu primer usuario'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={newUser.nombre}
                      onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={newUser.apellido}
                      onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <select
                    id="rol"
                    value={newUser.rol}
                    onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {ROLES_CREABLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                  <p className="font-medium">Formato del usuario generado:</p>
                  <p className="text-xs mt-1">
                    nombre.apellido + 4 dígitos (ej: {newUser.nombre.toLowerCase() || 'juan'}.{newUser.apellido.toLowerCase() || 'perez'}1234)
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Crear Usuario'
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
