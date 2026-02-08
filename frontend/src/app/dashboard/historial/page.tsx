'use client';

import { useEffect, useState, useCallback } from 'react';
import { auditLogsApi, usersApi } from '@/lib/api';
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
import { Clock, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

interface AuditLog {
  id: string;
  accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR' | 'IMPORTAR';
  entidad: string;
  entidadId: string | null;
  descripcion: string;
  datos: Record<string, unknown> | null;
  usuarioId: string;
  institucionId: string;
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

interface UserOption {
  id: string;
  nombre: string;
  apellido: string;
  role: string;
}

const accionColors: Record<string, string> = {
  CREAR: 'bg-green-100 text-green-800',
  ACTUALIZAR: 'bg-blue-100 text-blue-800',
  ELIMINAR: 'bg-red-100 text-red-800',
  IMPORTAR: 'bg-purple-100 text-purple-800',
};

const entidadOptions = [
  'Usuario',
  'Clase',
  'Inscripcion',
  'Calificacion',
  'Asistencia',
  'Cobro',
  'Pago',
  'Estudiante',
];

const accionOptions = ['CREAR', 'ACTUALIZAR', 'ELIMINAR', 'IMPORTAR'];

export default function HistorialPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Filters
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [selectedEntidad, setSelectedEntidad] = useState('');
  const [selectedAccion, setSelectedAccion] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 30 };
      if (fechaDesde) params.fechaDesde = new Date(fechaDesde).toISOString();
      if (fechaHasta) {
        const end = new Date(fechaHasta);
        end.setHours(23, 59, 59, 999);
        params.fechaHasta = end.toISOString();
      }
      if (selectedUsuario) params.usuarioId = selectedUsuario;
      if (selectedEntidad) params.entidad = selectedEntidad;
      if (selectedAccion) params.accion = selectedAccion;

      const res = await auditLogsApi.getAll(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, selectedUsuario, selectedEntidad, selectedAccion]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  useEffect(() => {
    usersApi.getAll().then((res) => {
      setUsers(
        (res.data.data || []).map((u: any) => ({
          id: u.id,
          nombre: u.nombre,
          apellido: u.apellido,
          role: u.role,
        }))
      );
    }).catch(() => {});
  }, []);

  const clearFilters = () => {
    setFechaDesde('');
    setFechaHasta('');
    setSelectedUsuario('');
    setSelectedEntidad('');
    setSelectedAccion('');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasFilters = fechaDesde || fechaHasta || selectedUsuario || selectedEntidad || selectedAccion;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-8 w-8 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold">Historial de Actividades</h1>
          <p className="text-sm text-muted-foreground">
            Registro de acciones realizadas en la institución
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
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad</label>
              <Select value={selectedEntidad} onValueChange={setSelectedEntidad}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {entidadOptions.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Acción</label>
              <Select value={selectedAccion} onValueChange={setSelectedAccion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {accionOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Usuario</label>
              <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Search className="h-5 w-5 animate-pulse" />
                <span>Cargando historial...</span>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mb-3 opacity-30" />
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
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead className="hidden md:table-cell">Descripción</TableHead>
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
                      <Badge
                        variant="secondary"
                        className={accionColors[log.accion] || ''}
                      >
                        {log.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entidad}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                      {log.descripcion}
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
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
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
