'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cobrosApi, ciclosApi, usersApi, clasesApi } from '@/lib/api';
import {
  Loader2,
  Users,
  DollarSign,
  GraduationCap,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Ciclo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface EstadisticasCobros {
  totalCobros: number;
  totalMonto: number;
  totalRecaudado: number;
  totalPendiente: number;
  porEstado: Record<string, number>;
  porConcepto: Record<string, { total: number; recaudado: number }>;
}

interface Usuario {
  id: string;
  role: string;
}

interface Clase {
  id: string;
}

const conceptoLabels: Record<string, string> = {
  MATRICULA: 'Matrícula',
  MENSUALIDAD: 'Mensualidad',
  MATERIAL: 'Material',
  UNIFORME: 'Uniforme',
  ACTIVIDAD: 'Actividad',
  OTRO: 'Otro',
};

export default function EstadisticasPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [selectedCiclo, setSelectedCiclo] = useState<string>('');
  const [estadisticasCobros, setEstadisticasCobros] = useState<EstadisticasCobros | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [ciclosRes, usersRes, clasesRes] = await Promise.all([
          ciclosApi.getAll(),
          usersApi.getAll(),
          clasesApi.getAll(),
        ]);

        const ciclosData = ciclosRes.data?.data || ciclosRes.data || [];
        setCiclos(ciclosData);
        setUsuarios(usersRes.data?.data || usersRes.data || []);
        setClases(clasesRes.data?.data || clasesRes.data || []);

        const cicloActivo = ciclosData.find((c: Ciclo) => c.activo);
        if (cicloActivo) {
          setSelectedCiclo(cicloActivo.id);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchEstadisticas = async () => {
      if (!selectedCiclo) return;

      try {
        const response = await cobrosApi.getEstadisticas(selectedCiclo);
        setEstadisticasCobros(response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchEstadisticas();
  }, [selectedCiclo]);

  const countByRole = (role: string) =>
    usuarios.filter((u) => u.role === role).length;

  const porcentajeRecaudado =
    estadisticasCobros && estadisticasCobros.totalMonto > 0
      ? ((estadisticasCobros.totalRecaudado / estadisticasCobros.totalMonto) * 100).toFixed(1)
      : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas</h1>
          <p className="text-muted-foreground">
            Resumen general de la institución
          </p>
        </div>
        <Select value={selectedCiclo} onValueChange={setSelectedCiclo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar ciclo" />
          </SelectTrigger>
          <SelectContent>
            {ciclos.map((ciclo) => (
              <SelectItem key={ciclo.id} value={ciclo.id}>
                {ciclo.nombre} {ciclo.activo && '(Activo)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* General Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {countByRole('ESTUDIANTE')}
                </p>
                <p className="text-sm text-muted-foreground">Estudiantes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countByRole('DOCENTE')}</p>
                <p className="text-sm text-muted-foreground">Docentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clases.length}</p>
                <p className="text-sm text-muted-foreground">Clases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {countByRole('COORDINADOR') +
                    countByRole('COORDINADOR_ACADEMICO') +
                    countByRole('SECRETARIA')}
                </p>
                <p className="text-sm text-muted-foreground">Personal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Stats */}
      {estadisticasCobros && (
        <>
          <h2 className="text-xl font-semibold pt-4">Estadísticas Financieras</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${estadisticasCobros.totalMonto.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total a cobrar</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${estadisticasCobros.totalRecaudado.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Recaudado ({porcentajeRecaudado}%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${estadisticasCobros.totalPendiente.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Pendiente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {estadisticasCobros.porEstado.VENCIDO || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Cobros vencidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Cobros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(estadisticasCobros.porEstado).map(
                    ([estado, cantidad]) => {
                      const total = estadisticasCobros.totalCobros;
                      const porcentaje =
                        total > 0 ? ((cantidad / total) * 100).toFixed(1) : 0;

                      const colors: Record<string, string> = {
                        PENDIENTE: 'bg-amber-500',
                        PARCIAL: 'bg-blue-500',
                        PAGADO: 'bg-green-500',
                        VENCIDO: 'bg-red-500',
                      };

                      return (
                        <div key={estado}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">
                              {estado.toLowerCase()}
                            </span>
                            <span>
                              {cantidad} ({porcentaje}%)
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[estado] || 'bg-gray-500'}`}
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recaudación por Concepto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(estadisticasCobros.porConcepto).map(
                    ([concepto, data]) => {
                      const porcentaje =
                        data.total > 0
                          ? ((data.recaudado / data.total) * 100).toFixed(1)
                          : 0;

                      return (
                        <div key={concepto}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{conceptoLabels[concepto] || concepto}</span>
                            <span>
                              ${data.recaudado.toLocaleString()} / $
                              {data.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
