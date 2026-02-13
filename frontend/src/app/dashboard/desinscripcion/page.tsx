'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { nivelesApi, inscripcionesApi, usersApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserMinus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  RotateCcw,
  Search,
} from 'lucide-react';

interface Nivel {
  id: string;
  nombre: string;
}

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
}

interface DesinscribirResult {
  estudianteId: string;
  nivelId: string;
  inscripcionesDesactivadas: number;
}

interface DesinscribirMasivoResult {
  exitosos: DesinscribirResult[];
  fallidos: Array<{ estudianteId: string; error: string }>;
}

interface ReactivarResult {
  estudianteId: string;
  nivelId: string;
  inscripcionesReactivadas: number;
}

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

export default function DesinscripcionPage() {
  // Individual state
  const [searchEstudiante, setSearchEstudiante] = useState('');
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [nivelId, setNivelId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [desinscribirResult, setDesinscribirResult] = useState<DesinscribirResult | null>(null);

  // Masivo state
  const [masivoNivelId, setMasivoNivelId] = useState('');
  const [masivoMotivo, setMasivoMotivo] = useState('');
  const [masivoSearch, setMasivoSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [masivoResult, setMasivoResult] = useState<DesinscribirMasivoResult | null>(null);

  // Reactivar state
  const [reactivarSearch, setReactivarSearch] = useState('');
  const [reactivarEstudiante, setReactivarEstudiante] = useState<Estudiante | null>(null);
  const [reactivarNivelId, setReactivarNivelId] = useState('');
  const [reactivarResult, setReactivarResult] = useState<ReactivarResult | null>(null);

  const { data: niveles = [] } = useQuery({
    queryKey: queryKeys.niveles.list(),
    queryFn: async () => {
      const res = await nivelesApi.getAll();
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: allEstudiantes = [] } = useQuery({
    queryKey: ['estudiantes', 'all-for-desinscripcion'],
    queryFn: async () => {
      const res = await usersApi.getAll({ role: 'ESTUDIANTE', limit: 500 });
      return (res.data?.data || []) as Estudiante[];
    },
    staleTime: 60_000,
  });

  // Filter for individual search
  const filteredEstudiantes = searchEstudiante.length >= 2
    ? allEstudiantes.filter((e: Estudiante) => {
        const q = searchEstudiante.toLowerCase();
        return e.nombre.toLowerCase().includes(q) ||
          e.apellido.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q);
      }).slice(0, 15)
    : [];

  // Filter for masivo search
  const filteredMasivo = masivoSearch.length >= 2
    ? allEstudiantes.filter((e: Estudiante) => {
        const q = masivoSearch.toLowerCase();
        return e.nombre.toLowerCase().includes(q) ||
          e.apellido.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q);
      }).slice(0, 30)
    : [];

  // Filter for reactivar search
  const filteredReactivar = reactivarSearch.length >= 2
    ? allEstudiantes.filter((e: Estudiante) => {
        const q = reactivarSearch.toLowerCase();
        return e.nombre.toLowerCase().includes(q) ||
          e.apellido.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q);
      }).slice(0, 15)
    : [];

  const desinscribirMutation = useMutation({
    mutationFn: () =>
      inscripcionesApi.desinscribir({
        estudianteId: selectedEstudiante!.id,
        nivelId,
        motivo: motivo || undefined,
      }),
    onSuccess: (res) => setDesinscribirResult(res.data),
    onError: (err: ApiError) => {
      alert(err.response?.data?.message || 'Error al desinscribir');
    },
  });

  const desinscribirMasivoMutation = useMutation({
    mutationFn: () =>
      inscripcionesApi.desinscribirMasivo({
        estudianteIds: Array.from(selectedIds),
        nivelId: masivoNivelId,
        motivo: masivoMotivo || undefined,
      }),
    onSuccess: (res) => {
      setMasivoResult(res.data);
      setSelectedIds(new Set());
    },
    onError: (err: ApiError) => {
      alert(err.response?.data?.message || 'Error al desinscribir');
    },
  });

  const reactivarMutation = useMutation({
    mutationFn: () =>
      inscripcionesApi.reactivar({
        estudianteId: reactivarEstudiante!.id,
        nivelId: reactivarNivelId,
      }),
    onSuccess: (res) => setReactivarResult(res.data),
    onError: (err: ApiError) => {
      alert(err.response?.data?.message || 'Error al reactivar');
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserMinus className="h-8 w-8 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold">Desinscripcion de Estudiantes</h1>
          <p className="text-sm text-muted-foreground">
            Desactiva inscripciones de estudiantes en un nivel
          </p>
        </div>
      </div>

      {/* Desinscripcion Individual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Desinscripcion Individual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar Estudiante</Label>
            <Input
              placeholder="Nombre, apellido o usuario..."
              value={searchEstudiante}
              onChange={(e) => {
                setSearchEstudiante(e.target.value);
                setSelectedEstudiante(null);
                setDesinscribirResult(null);
              }}
            />
            {filteredEstudiantes.length > 0 && !selectedEstudiante && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredEstudiantes.map((e: Estudiante) => (
                  <button
                    key={e.id}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-b-0"
                    onClick={() => {
                      setSelectedEstudiante(e);
                      setSearchEstudiante(`${e.nombre} ${e.apellido}`);
                    }}
                  >
                    <span className="font-medium">{e.nombre} {e.apellido}</span>
                    <span className="text-muted-foreground ml-2">({e.username})</span>
                  </button>
                ))}
              </div>
            )}
            {selectedEstudiante && (
              <p className="text-xs text-green-600">
                Seleccionado: {selectedEstudiante.nombre} {selectedEstudiante.apellido}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select value={nivelId} onValueChange={setNivelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  {niveles.map((n: Nivel) => (
                    <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                placeholder="Razon de la desinscripcion..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm('¿Confirma desinscribir a este estudiante?')) return;
              setDesinscribirResult(null);
              desinscribirMutation.mutate();
            }}
            disabled={!selectedEstudiante || !nivelId || desinscribirMutation.isPending}
          >
            {desinscribirMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            Desinscribir
          </Button>

          {desinscribirResult && (
            <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                {desinscribirResult.inscripcionesDesactivadas} inscripcion(es) desactivada(s).
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desinscripcion Masiva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Desinscripcion Masiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select value={masivoNivelId} onValueChange={(v) => { setMasivoNivelId(v); setMasivoResult(null); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  {niveles.map((n: Nivel) => (
                    <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input
                placeholder="Razon de la desinscripcion..."
                value={masivoMotivo}
                onChange={(e) => setMasivoMotivo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Buscar y seleccionar estudiantes</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar estudiantes..."
                value={masivoSearch}
                onChange={(e) => setMasivoSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredMasivo.length > 0 && (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {filteredMasivo.map((e: Estudiante) => (
                <label
                  key={e.id}
                  className="flex items-center px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-b-0 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(e.id)}
                    onChange={() => toggleSelect(e.id)}
                    className="mr-3 h-4 w-4 rounded"
                  />
                  <span className="font-medium">{e.nombre} {e.apellido}</span>
                  <span className="text-muted-foreground ml-2">({e.username})</span>
                </label>
              ))}
            </div>
          )}

          {selectedIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} estudiante(s) seleccionado(s)
            </p>
          )}

          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm(`¿Confirma desinscribir a ${selectedIds.size} estudiante(s)?`)) return;
              setMasivoResult(null);
              desinscribirMasivoMutation.mutate();
            }}
            disabled={selectedIds.size === 0 || !masivoNivelId || desinscribirMasivoMutation.isPending}
          >
            {desinscribirMasivoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4 mr-2" />
            )}
            Desinscribir Seleccionados
          </Button>

          {masivoResult && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {masivoResult.exitosos.length} exitoso(s), {masivoResult.fallidos.length} fallido(s)
                </span>
              </div>
              {masivoResult.fallidos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Errores:</p>
                  <ul className="text-xs text-red-500 space-y-1">
                    {masivoResult.fallidos.map((f, i) => (
                      <li key={i}>{f.estudianteId}: {f.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reactivar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reactivar Estudiante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reactiva las inscripciones previamente desactivadas de un estudiante en un nivel.
          </p>

          <div className="space-y-2">
            <Label>Buscar Estudiante</Label>
            <Input
              placeholder="Nombre, apellido o usuario..."
              value={reactivarSearch}
              onChange={(e) => {
                setReactivarSearch(e.target.value);
                setReactivarEstudiante(null);
                setReactivarResult(null);
              }}
            />
            {filteredReactivar.length > 0 && !reactivarEstudiante && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredReactivar.map((e: Estudiante) => (
                  <button
                    key={e.id}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b last:border-b-0"
                    onClick={() => {
                      setReactivarEstudiante(e);
                      setReactivarSearch(`${e.nombre} ${e.apellido}`);
                    }}
                  >
                    <span className="font-medium">{e.nombre} {e.apellido}</span>
                    <span className="text-muted-foreground ml-2">({e.username})</span>
                  </button>
                ))}
              </div>
            )}
            {reactivarEstudiante && (
              <p className="text-xs text-green-600">
                Seleccionado: {reactivarEstudiante.nombre} {reactivarEstudiante.apellido}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nivel</Label>
            <Select value={reactivarNivelId} onValueChange={setReactivarNivelId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar nivel" />
              </SelectTrigger>
              <SelectContent>
                {niveles.map((n: Nivel) => (
                  <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              setReactivarResult(null);
              reactivarMutation.mutate();
            }}
            disabled={!reactivarEstudiante || !reactivarNivelId || reactivarMutation.isPending}
          >
            {reactivarMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reactivar
          </Button>

          {reactivarResult && (
            <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-2">
              {reactivarResult.inscripcionesReactivadas > 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">
                    {reactivarResult.inscripcionesReactivadas} inscripcion(es) reactivada(s).
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-600">
                    No se encontraron inscripciones inactivas para reactivar.
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
