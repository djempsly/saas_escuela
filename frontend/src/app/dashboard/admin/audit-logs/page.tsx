'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi, usersApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface AuditLog {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  descripcion: string;
  datos: Record<string, unknown> | null;
  ipAddress: string | null;
  usuarioId: string;
  institucionId: string | null;
  createdAt: string;
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    role: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const accionColors: Record<string, string> = {
  CREAR: 'bg-green-100 text-green-800',
  ACTUALIZAR: 'bg-blue-100 text-blue-800',
  ELIMINAR: 'bg-red-100 text-red-800',
  IMPORTAR: 'bg-purple-100 text-purple-800',
  LOGIN: 'bg-yellow-100 text-yellow-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  PASSWORD_CAMBIADO: 'bg-orange-100 text-orange-800',
  CALIFICACION_PUBLICADA: 'bg-indigo-100 text-indigo-800',
  CONFIG_MODIFICADA: 'bg-pink-100 text-pink-800',
  DESINSCRIPCION: 'bg-red-100 text-red-700',
};

const accionOptions = [
  'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'IMPORTAR',
  'LOGIN', 'LOGOUT', 'PASSWORD_CAMBIADO',
  'CALIFICACION_PUBLICADA', 'CONFIG_MODIFICADA', 'DESINSCRIPCION',
];

const entidadOptions = [
  'Usuario', 'Clase', 'Inscripcion', 'Calificacion',
  'Asistencia', 'Cobro', 'Pago', 'Institucion',
  'Nivel', 'CicloEducativo', 'Materia', 'Promocion',
];

export default function AdminAuditLogsPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [selectedEntidad, setSelectedEntidad] = useState('');
  const [selectedAccion, setSelectedAccion] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const filters = {
    page,
    limit: 30,
    ...(fechaDesde && { fechaDesde: new Date(fechaDesde).toISOString() }),
    ...(fechaHasta && {
      fechaHasta: (() => {
        const end = new Date(fechaHasta);
        end.setHours(23, 59, 59, 999);
        return end.toISOString();
      })(),
    }),
    ...(selectedUsuario && { usuarioId: selectedUsuario }),
    ...(selectedEntidad && { entidad: selectedEntidad }),
    ...(selectedAccion && { accion: selectedAccion }),
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auditLogs.list(filters),
    queryFn: async () => {
      const res = await auditLogsApi.getAll(filters);
      return res.data as { data: AuditLog[]; pagination: Pagination };
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users-options'],
    queryFn: async () => {
      const res = await usersApi.getAll({ limit: 500 });
      return (res.data.data || []).map((u: { id: string; nombre: string; apellido: string; role: string }) => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        role: u.role,
      }));
    },
    staleTime: 60_000,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
        <p>Solo administradores pueden acceder a esta seccion.</p>
      </div>
    );
  }

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 30, total: 0, totalPages: 0 };
  const hasFilters = fechaDesde || fechaHasta || selectedUsuario || selectedEntidad || selectedAccion;

  const clearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setSelectedUsuario('');
    setSelectedEntidad('');
    setSelectedAccion('');
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-8 w-8 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Registro completo de todas las acciones del sistema
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad</label>
              <Select value={selectedEntidad} onValueChange={(v) => { setSelectedEntidad(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {entidadOptions.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Accion</label>
              <Select value={selectedAccion} onValueChange={(v) => { setSelectedAccion(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {accionOptions.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Usuario</label>
              <Select value={selectedUsuario} onValueChange={(v) => { setSelectedUsuario(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u: { id: string; nombre: string; apellido: string }) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nombre} {u.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ScrollText className="h-12 w-12 mb-3 opacity-30" />
              <p>No se encontraron registros</p>
              {hasFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Accion</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead className="hidden md:table-cell">Descripcion</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {log.usuario.nombre} {log.usuario.apellido}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.usuario.role.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={accionColors[log.accion] || ''}>
                        {log.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entidad}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                      {log.descripcion}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Mostrando {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
