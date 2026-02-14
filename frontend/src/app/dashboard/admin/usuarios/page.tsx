'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, institucionesApi, usersApi } from '@/lib/api';
import { Label } from '@/components/ui/label';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Key,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  Loader2,
} from 'lucide-react';

interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  role: string;
  activo: boolean;
  institucionId: string | null;
  institucion: {
    id: string;
    nombre: string;
    slug: string;
  } | null;
  createdAt: string;
}

interface Institucion {
  id: string;
  nombre: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalUsuarios: number;
  totalInstituciones: number;
  usuariosActivos: number;
  usuariosPorRol: Record<string, number>;
}

const ROLES_DISPLAY: Record<string, string> = {
  ADMIN: 'Admin',
  DIRECTOR: 'Director',
  COORDINADOR: 'Coordinador',
  COORDINADOR_ACADEMICO: 'Coord. Académico',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
  SECRETARIA: 'Secretaria',
  BIBLIOTECARIO: 'Bibliotecario',
  DIGITADOR: 'Digitador',
  PSICOLOGO: 'Psicólogo',
};

const ROLES_CREABLES = [
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'SECRETARIA', label: 'Secretaria' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'COORDINADOR_ACADEMICO', label: 'Coordinador Académico' },
  { value: 'BIBLIOTECARIO', label: 'Bibliotecario' },
  { value: 'DIGITADOR', label: 'Digitador' },
  { value: 'PSICOLOGO', label: 'Psicólogo' },
];

const getDefaultPasswordByRole = (role: string): string => {
  const passwordMap: Record<string, string> = {
    ESTUDIANTE: 'estudiante123',
    DOCENTE: 'docente123',
    COORDINADOR: 'coordinador123',
    COORDINADOR_ACADEMICO: 'academico123',
    SECRETARIA: 'secretaria123',
    BIBLIOTECARIO: 'bibliotecario123',
    DIGITADOR: 'digitador123',
    PSICOLOGO: 'psicologo123',
    DIRECTOR: 'director123',
    ADMIN: 'admin123',
  };
  return passwordMap[role] || 'usuario123';
};

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resetPasswordModal, setResetPasswordModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    tempPassword: string | null;
  }>({ isOpen: false, userId: '', userName: '', tempPassword: null });
  const [copied, setCopied] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    nombre: '',
    segundoNombre: '',
    apellido: '',
    segundoApellido: '',
    email: '',
    rol: 'ESTUDIANTE',
    institucionId: '',
  });
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; tempPassword: string } | null>(null);

  // Filtros
  const [filters, setFilters] = useState({
    institucionId: '',
    role: '',
    activo: '',
    search: '',
  });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.institucionId) params.institucionId = filters.institucionId;
      if (filters.role) params.role = filters.role;
      if (filters.activo) params.activo = filters.activo;

      const response = await adminApi.getAllUsers(params);
      const data = response.data;
      setUsers(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = async () => {
    try {
      const response = await adminApi.getUserStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchInstituciones = async () => {
    try {
      const response = await institucionesApi.getAll();
      setInstituciones(response.data || []);
    } catch (error) {
      console.error('Error fetching instituciones:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchInstituciones();
  }, [fetchUsers]);

  const handleResetPassword = async (userId: string, userName: string) => {
    setResetPasswordModal({ isOpen: true, userId, userName, tempPassword: null });
  };

  const confirmResetPassword = async () => {
    try {
      const response = await adminApi.forceResetPassword(resetPasswordModal.userId);
      setResetPasswordModal((prev) => ({
        ...prev,
        tempPassword: response.data.tempPassword,
      }));
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error al resetear la contraseña');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ institucionId: '', role: '', activo: '', search: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const response = await usersApi.create({
        ...newUser,
        institucionId: newUser.institucionId || undefined,
      });
      const createdUser = response.data.data?.user;
      setCreatedCredentials({
        username: createdUser?.username || '',
        tempPassword: response.data.data?.tempPassword || '',
      });
      setShowCreateModal(false);
      setNewUser({ nombre: '', segundoNombre: '', apellido: '', segundoApellido: '', email: '', rol: 'ESTUDIANTE', institucionId: '' });
      fetchUsers();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || (error instanceof Error ? error.message : 'Error al crear usuario'));
    } finally {
      setIsCreating(false);
    }
  };

  const handlePrint = () => {
    if (filteredUsers.length === 0) {
      alert('No hay usuarios para imprimir');
      return;
    }

    const rolLabel = filters.role ? (ROLES_DISPLAY[filters.role] || filters.role) : 'Todos los roles';
    const instLabel = filters.institucionId
      ? instituciones.find(i => i.id === filters.institucionId)?.nombre || ''
      : 'Todas';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista de Usuarios</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .subtitle { color: #666; margin-bottom: 16px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
            tr:nth-child(even) { background: #fafafa; }
            .footer { margin-top: 16px; font-size: 10px; color: #999; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Lista de Usuarios</h1>
          <div class="subtitle">
            Rol: ${rolLabel} | Institución: ${instLabel} | Total: ${filteredUsers.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre Completo</th>
                <th>Usuario</th>
                <th>Contraseña</th>
                <th>Rol</th>
                <th>Institución</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.map((u, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${u.nombre} ${u.apellido}</td>
                  <td>${u.username}</td>
                  <td>${getDefaultPasswordByRole(u.role)}</td>
                  <td>${ROLES_DISPLAY[u.role] || u.role}</td>
                  <td>${u.institucion?.nombre || 'Sin institución'}</td>
                  <td>${u.activo ? 'Activo' : 'Inactivo'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Impreso el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredUsers = filters.search
    ? users.filter(
        (u) =>
          u.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
          u.apellido.toLowerCase().includes(filters.search.toLowerCase()) ||
          u.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
          u.username.toLowerCase().includes(filters.search.toLowerCase())
      )
    : users;

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    DIRECTOR: 'bg-blue-100 text-blue-700',
    COORDINADOR: 'bg-purple-100 text-purple-700',
    COORDINADOR_ACADEMICO: 'bg-indigo-100 text-indigo-700',
    DOCENTE: 'bg-green-100 text-green-700',
    ESTUDIANTE: 'bg-yellow-100 text-yellow-700',
    SECRETARIA: 'bg-orange-100 text-orange-700',
    BIBLIOTECARIO: 'bg-teal-100 text-teal-700',
    DIGITADOR: 'bg-cyan-100 text-cyan-700',
    PSICOLOGO: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios del Sistema</h1>
          <p className="text-muted-foreground">
            Gestiona todos los usuarios de todas las instituciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Usuarios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.usuariosActivos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Instituciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInstituciones}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Directores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.usuariosPorRol?.DIRECTOR || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filters.institucionId}
              onChange={(e) => handleFilterChange('institucionId', e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Todas las instituciones</option>
              {instituciones.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre}
                </option>
              ))}
            </select>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">Admin</option>
              <option value="DIRECTOR">Director</option>
              <option value="COORDINADOR">Coordinador</option>
              <option value="COORDINADOR_ACADEMICO">Coord. Academico</option>
              <option value="DOCENTE">Docente</option>
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="SECRETARIA">Secretaria</option>
              <option value="BIBLIOTECARIO">Bibliotecario</option>
              <option value="DIGITADOR">Digitador</option>
              <option value="PSICOLOGO">Psicólogo</option>
            </select>
            <select
              value={filters.activo}
              onChange={(e) => handleFilterChange('activo', e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Limpiar
              </Button>
              <Button onClick={() => fetchUsers()} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Usuarios
          </CardTitle>
          <CardDescription>
            Mostrando {filteredUsers.length} de {pagination.total} usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredUsers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-sm font-medium">Usuario</th>
                      <th className="text-left p-3 text-sm font-medium">Email</th>
                      <th className="text-left p-3 text-sm font-medium">Rol</th>
                      <th className="text-left p-3 text-sm font-medium">Institucion</th>
                      <th className="text-left p-3 text-sm font-medium">Estado</th>
                      <th className="text-left p-3 text-sm font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">
                              {user.nombre} {user.apellido}
                            </p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{user.email || '-'}</td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              roleColors[user.role] || 'bg-gray-100'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 text-sm">
                          {user.institucion?.nombre || (
                            <span className="text-muted-foreground">Sin institucion</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              user.activo
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleResetPassword(user.id, `${user.nombre} ${user.apellido}`)
                            }
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Pagina {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontraron usuarios</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credenciales del usuario creado */}
      {createdCredentials && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium text-green-800">Usuario creado exitosamente</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    Usuario: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{createdCredentials.username}</strong>
                  </p>
                  <p>
                    Contraseña temporal: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{createdCredentials.tempPassword}</strong>
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Guarda estas credenciales. El usuario deberá cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCreatedCredentials(null)}>
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Primer Nombre *</Label>
                    <Input
                      id="nombre"
                      value={newUser.nombre}
                      onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                      placeholder="Juan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoNombre">Segundo Nombre</Label>
                    <Input
                      id="segundoNombre"
                      value={newUser.segundoNombre}
                      onChange={(e) => setNewUser({ ...newUser, segundoNombre: e.target.value })}
                      placeholder="Carlos (opcional)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Primer Apellido *</Label>
                    <Input
                      id="apellido"
                      value={newUser.apellido}
                      onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                      placeholder="Pérez"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoApellido">Segundo Apellido</Label>
                    <Input
                      id="segundoApellido"
                      value={newUser.segundoApellido}
                      onChange={(e) => setNewUser({ ...newUser, segundoApellido: e.target.value })}
                      placeholder="García (opcional)"
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
                  <Label htmlFor="institucion">Institución *</Label>
                  <select
                    id="institucion"
                    value={newUser.institucionId}
                    onChange={(e) => setNewUser({ ...newUser, institucionId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">Seleccionar institución...</option>
                    {instituciones.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.nombre}
                      </option>
                    ))}
                  </select>
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
                  <p className="font-medium">Credenciales generadas:</p>
                  <p className="text-xs mt-1">
                    Usuario: primer_nombre.primer_apellido + 4 dígitos
                  </p>
                  <p className="text-xs mt-2">
                    Contraseña por defecto: <strong className="font-mono bg-blue-100 px-2 py-0.5 rounded">{getDefaultPasswordByRole(newUser.rol)}</strong>
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
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

      {/* Reset Password Modal */}
      {resetPasswordModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Reset de Contraseña</CardTitle>
              <CardDescription>
                {resetPasswordModal.tempPassword
                  ? 'Contraseña temporal generada'
                  : `Resetear contraseña de ${resetPasswordModal.userName}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resetPasswordModal.tempPassword ? (
                <>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700 mb-2">Nueva contraseña temporal:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white rounded border font-mono">
                        {resetPasswordModal.tempPassword}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(resetPasswordModal.tempPassword!)}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El usuario debera cambiar esta contraseña en su proximo inicio de sesion.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Se generara una nueva contraseña temporal para este usuario. La contraseña actual
                  sera invalidada.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    setResetPasswordModal({
                      isOpen: false,
                      userId: '',
                      userName: '',
                      tempPassword: null,
                    })
                  }
                >
                  {resetPasswordModal.tempPassword ? 'Cerrar' : 'Cancelar'}
                </Button>
                {!resetPasswordModal.tempPassword && (
                  <Button className="flex-1" onClick={confirmResetPassword}>
                    Confirmar Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
