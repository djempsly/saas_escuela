'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { nivelesApi, ciclosApi, inscripcionesApi, usersApi } from '@/lib/api';
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
  ArrowUpCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  UserPlus,
} from 'lucide-react';

interface Nivel {
  id: string;
  nombre: string;
}

interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
  cerrado: boolean;
}

interface PromocionMasivaResult {
  promovidos: number;
  yaInscritos: number;
  totalAprobados: number;
  errores: Array<{ estudianteId: string; error: string }>;
}

interface PromocionIndividualResult {
  estudianteId: string;
  nivelDestinoId: string;
  clasesInscritas: number;
  yaInscrito: boolean;
}

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
}

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

export default function PromocionPage() {
  // Masivo state
  const [nivelOrigenId, setNivelOrigenId] = useState('');
  const [nivelDestinoId, setNivelDestinoId] = useState('');
  const [cicloDestinoId, setCicloDestinoId] = useState('');
  const [masivoResult, setMasivoResult] = useState<PromocionMasivaResult | null>(null);

  // Individual state
  const [indNivelDestinoId, setIndNivelDestinoId] = useState('');
  const [indCicloDestinoId, setIndCicloDestinoId] = useState('');
  const [searchEstudiante, setSearchEstudiante] = useState('');
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [individualResult, setIndividualResult] = useState<PromocionIndividualResult | null>(null);

  const { data: niveles = [] } = useQuery({
    queryKey: queryKeys.niveles.list(),
    queryFn: async () => {
      const res = await nivelesApi.getAll();
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: queryKeys.ciclos.list(),
    queryFn: async () => {
      const res = await ciclosApi.getAll();
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: estudiantes = [] } = useQuery({
    queryKey: ['estudiantes', 'search', searchEstudiante],
    queryFn: async () => {
      if (!searchEstudiante || searchEstudiante.length < 2) return [];
      const res = await usersApi.getAll({ role: 'ESTUDIANTE', limit: 20 });
      const data: Estudiante[] = res.data?.data || res.data || [];
      const q = searchEstudiante.toLowerCase();
      return data.filter(
        (e) =>
          e.nombre.toLowerCase().includes(q) ||
          e.apellido.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q)
      );
    },
    enabled: searchEstudiante.length >= 2,
  });

  const masivoMutation = useMutation({
    mutationFn: () =>
      inscripcionesApi.promoverMasivo({ nivelOrigenId, nivelDestinoId, cicloDestinoId }),
    onSuccess: (res) => setMasivoResult(res.data),
    onError: (err: ApiError) => {
      alert(err.response?.data?.message || 'Error al promover');
    },
  });

  const individualMutation = useMutation({
    mutationFn: () =>
      inscripcionesApi.promoverIndividual({
        estudianteId: selectedEstudiante!.id,
        nivelDestinoId: indNivelDestinoId,
        cicloDestinoId: indCicloDestinoId,
      }),
    onSuccess: (res) => setIndividualResult(res.data),
    onError: (err: ApiError) => {
      alert(err.response?.data?.message || 'Error al promover');
    },
  });

  const ciclosAbiertos = ciclos.filter((c: CicloLectivo) => !c.cerrado);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="h-8 w-8 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold">Promocion de Estudiantes</h1>
          <p className="text-sm text-muted-foreground">
            Promueve estudiantes aprobados de un nivel a otro
          </p>
        </div>
      </div>

      {/* Promocion Masiva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Promocion Masiva (Aprobados)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Promueve automaticamente a todos los estudiantes con situacion &quot;APROBADO&quot;
            en todas sus materias del nivel origen.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nivel Origen</Label>
              <Select value={nivelOrigenId} onValueChange={setNivelOrigenId}>
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
              <Label>Nivel Destino</Label>
              <Select value={nivelDestinoId} onValueChange={setNivelDestinoId}>
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
              <Label>Ciclo Lectivo Destino</Label>
              <Select value={cicloDestinoId} onValueChange={setCicloDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {ciclosAbiertos.map((c: CicloLectivo) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.activo ? '(Activo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => {
              setMasivoResult(null);
              masivoMutation.mutate();
            }}
            disabled={!nivelOrigenId || !nivelDestinoId || !cicloDestinoId || masivoMutation.isPending}
          >
            {masivoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4 mr-2" />
            )}
            Promover Aprobados
          </Button>

          {masivoResult && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Promocion completada</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total aprobados:</span>{' '}
                  <span className="font-medium">{masivoResult.totalAprobados}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Promovidos:</span>{' '}
                  <span className="font-medium text-green-600">{masivoResult.promovidos}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ya inscritos:</span>{' '}
                  <span className="font-medium text-yellow-600">{masivoResult.yaInscritos}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Errores:</span>{' '}
                  <span className="font-medium text-red-600">{masivoResult.errores.length}</span>
                </div>
              </div>
              {masivoResult.errores.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-600 mb-1">Errores:</p>
                  <ul className="text-xs text-red-500 space-y-1">
                    {masivoResult.errores.map((e, i) => (
                      <li key={i}>Estudiante {e.estudianteId}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promocion Individual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Promocion Individual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Promueve manualmente a un estudiante especifico (ej: reprobados por decision administrativa).
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar Estudiante</Label>
              <Input
                placeholder="Escribe nombre, apellido o usuario..."
                value={searchEstudiante}
                onChange={(e) => {
                  setSearchEstudiante(e.target.value);
                  setSelectedEstudiante(null);
                  setIndividualResult(null);
                }}
              />
              {estudiantes.length > 0 && !selectedEstudiante && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {estudiantes.map((e: Estudiante) => (
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
                <Label>Nivel Destino</Label>
                <Select value={indNivelDestinoId} onValueChange={setIndNivelDestinoId}>
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
                <Label>Ciclo Lectivo Destino</Label>
                <Select value={indCicloDestinoId} onValueChange={setIndCicloDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ciclosAbiertos.map((c: CicloLectivo) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} {c.activo ? '(Activo)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => {
                setIndividualResult(null);
                individualMutation.mutate();
              }}
              disabled={
                !selectedEstudiante ||
                !indNivelDestinoId ||
                !indCicloDestinoId ||
                individualMutation.isPending
              }
            >
              {individualMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Promover Estudiante
            </Button>

            {individualResult && (
              <div className="bg-slate-50 rounded-lg p-4">
                {individualResult.yaInscrito ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span>El estudiante ya estaba inscrito en el nivel destino.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>
                      Estudiante promovido exitosamente. Inscrito en{' '}
                      {individualResult.clasesInscritas} clase(s).
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
