'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usersApi } from '@/lib/api';
import {
  Users,
  Search,
  Loader2,
  KeyRound,
  Mail,
  User,
} from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface Staff {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  username: string;
  role: string;
  activo: boolean;
  fotoUrl?: string;
  createdAt: string;
}

const ROLES_DISPLAY: Record<string, string> = {
  COORDINADOR: 'Coordinador',
  COORDINADOR_ACADEMICO: 'Coord. Academico',
  DOCENTE: 'Docente',
  SECRETARIA: 'Secretaria',
};

const ROLE_COLORS: Record<string, string> = {
  COORDINADOR: 'bg-purple-100 text-purple-700',
  COORDINADOR_ACADEMICO: 'bg-blue-100 text-blue-700',
  DOCENTE: 'bg-green-100 text-green-700',
  SECRETARIA: 'bg-orange-100 text-orange-700',
};

export default function PersonalPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await usersApi.getStaff();
      setStaff(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando personal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('¿Generar nueva contrasena temporal para este usuario?')) return;

    try {
      const response = await usersApi.resetPasswordManual(userId);
      alert(`Nueva contrasena temporal: ${response.data.tempPassword}`);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al resetear contrasena');
    }
  };

  const filteredStaff = staff.filter((s) => {
    const matchSearch =
      s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = !filterRole || s.role === filterRole;
    return matchSearch && matchRole;
  });

  // Calcular estadisticas
  const stats = {
    total: staff.length,
    activos: staff.filter((s) => s.activo).length,
    coordinadores: staff.filter((s) => s.role === 'COORDINADOR' || s.role === 'COORDINADOR_ACADEMICO').length,
    docentes: staff.filter((s) => s.role === 'DOCENTE').length,
    secretarias: staff.filter((s) => s.role === 'SECRETARIA').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Personal</h1>
        <p className="text-muted-foreground">
          Gestiona el personal de tu institucion
        </p>
      </div>

      {/* Estadisticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
            <div className="text-sm text-muted-foreground">Activos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-purple-600">{stats.coordinadores}</div>
            <div className="text-sm text-muted-foreground">Coordinadores</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{stats.docentes}</div>
            <div className="text-sm text-muted-foreground">Docentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-orange-600">{stats.secretarias}</div>
            <div className="text-sm text-muted-foreground">Secretarias</div>
          </CardContent>
        </Card>
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

      {/* Lista de Personal */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredStaff.length > 0 ? (
            filteredStaff.map((s) => (
              <Card key={s.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                        s.activo ? 'bg-primary' : 'bg-slate-400'
                      }`}
                    >
                      {s.fotoUrl ? (
                        <img
                          src={s.fotoUrl}
                          alt={`${s.nombre} ${s.apellido}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span>{s.nombre[0]}{s.apellido[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {s.nombre} {s.apellido}
                        </p>
                        {!s.activo && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          @{s.username}
                        </span>
                        {s.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {s.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${ROLE_COLORS[s.role] || 'bg-slate-100'}`}>
                      {ROLES_DISPLAY[s.role] || s.role}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResetPassword(s.id)}
                        title="Resetear contrasena"
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
                <h3 className="text-lg font-medium mb-2">No hay personal registrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterRole
                    ? 'No se encontraron resultados con los filtros aplicados'
                    : 'Crea usuarios con rol de Docente, Coordinador o Secretaria desde la seccion de Usuarios'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
