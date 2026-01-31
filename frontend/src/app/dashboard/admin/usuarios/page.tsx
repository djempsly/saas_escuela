'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, institucionesApi } from '@/lib/api';
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
      const params: any = {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuarios del Sistema</h1>
        <p className="text-muted-foreground">
          Gestiona todos los usuarios de todas las instituciones
        </p>
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
