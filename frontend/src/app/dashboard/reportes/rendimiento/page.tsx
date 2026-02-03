'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { clasesApi, ciclosApi, calificacionesApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
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
import { Badge } from '@/components/ui/badge';

interface Ciclo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { nombre: string };
  docente: { nombre: string; apellido: string };
}

interface CalificacionEstudiante {
  estudiante: {
    id: string;
    nombre: string;
    apellido: string;
  };
  promedio: number;
  calificaciones: {
    periodo: string;
    valor: number | null;
  }[];
}

export default function ReporteRendimientoPage() {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [selectedCiclo, setSelectedCiclo] = useState<string>('');
  const [selectedClase, setSelectedClase] = useState<string>('');
  const [calificaciones, setCalificaciones] = useState<CalificacionEstudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReporte, setIsLoadingReporte] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ciclosRes, clasesRes] = await Promise.all([
          ciclosApi.getAll(),
          clasesApi.getAll(),
        ]);
        const ciclosData = ciclosRes.data?.data || ciclosRes.data || [];
        setCiclos(ciclosData);
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
    fetchData();
  }, []);

  const generarReporte = async () => {
    if (!selectedClase) return;

    setIsLoadingReporte(true);
    try {
      const response = await calificacionesApi.getByClase(selectedClase);
      const responseData = response.data?.data || response.data;

      // La API devuelve { clase, calificaciones, totalEstudiantes }
      // Extraer el array de calificaciones
      let calificacionesArray: any[] = [];

      if (Array.isArray(responseData)) {
        calificacionesArray = responseData;
      } else if (responseData?.calificaciones && Array.isArray(responseData.calificaciones)) {
        calificacionesArray = responseData.calificaciones;
      }

      // Transformar al formato esperado por el componente
      const calificacionesTransformadas = calificacionesArray.map((cal: any) => ({
        estudiante: cal.estudiante || { id: cal.estudianteId, nombre: '', apellido: '' },
        promedio: cal.promedioFinal ?? 0,
        calificaciones: [
          { periodo: 'P1', valor: cal.p1 },
          { periodo: 'P2', valor: cal.p2 },
          { periodo: 'P3', valor: cal.p3 },
          { periodo: 'P4', valor: cal.p4 },
        ],
      }));

      setCalificaciones(calificacionesTransformadas);
    } catch (error) {
      console.error('Error generando reporte:', error);
      setCalificaciones([]);
    } finally {
      setIsLoadingReporte(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getPromedioColor = (promedio: number) => {
    if (promedio >= 8) return 'text-green-600';
    if (promedio >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPromedioIcon = (promedio: number) => {
    if (promedio >= 8) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (promedio >= 6) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const promedioGeneral = calificaciones.length > 0
    ? calificaciones.reduce((acc, c) => acc + c.promedio, 0) / calificaciones.length
    : 0;

  const aprobados = calificaciones.filter((c) => c.promedio >= 6).length;
  const reprobados = calificaciones.filter((c) => c.promedio < 6).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const claseSeleccionada = clases.find((c) => c.id === selectedClase);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Rendimiento Academico</h1>
          <p className="text-muted-foreground">
            Analisis de promedios y tendencias
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Ciclo Lectivo</Label>
              <Select value={selectedCiclo} onValueChange={setSelectedCiclo}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Clase</Label>
              <Select value={selectedClase} onValueChange={(v) => {
                setSelectedClase(v);
                setCalificaciones([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar clase" />
                </SelectTrigger>
                <SelectContent>
                  {clases.map((clase) => (
                    <SelectItem key={clase.id} value={clase.id}>
                      {clase.materia.nombre} - {clase.nivel.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generarReporte}
                disabled={!selectedClase}
                className="w-full"
              >
                Generar Reporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoadingReporte ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : calificaciones.length > 0 ? (
        <>
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Promedio General</p>
                  <p className={`text-3xl font-bold ${getPromedioColor(promedioGeneral)}`}>
                    {promedioGeneral.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Estudiantes</p>
                  <p className="text-3xl font-bold text-primary">
                    {calificaciones.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                  <p className="text-3xl font-bold text-green-600">{aprobados}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">En Riesgo</p>
                  <p className="text-3xl font-bold text-red-600">{reprobados}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla detallada */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {claseSeleccionada?.materia.nombre} - {claseSeleccionada?.nivel.nombre}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Docente: {claseSeleccionada?.docente.nombre} {claseSeleccionada?.docente.apellido}
                </p>
              </div>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estudiante</TableHead>
                    <TableHead className="text-center">Promedio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Tendencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calificaciones
                    .sort((a, b) => b.promedio - a.promedio)
                    .map((cal) => (
                      <TableRow key={cal.estudiante.id}>
                        <TableCell className="font-medium">
                          {cal.estudiante.nombre} {cal.estudiante.apellido}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold ${getPromedioColor(cal.promedio)}`}>
                            {cal.promedio.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {cal.promedio >= 6 ? (
                            <Badge variant="success">Aprobado</Badge>
                          ) : (
                            <Badge variant="destructive">En riesgo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPromedioIcon(cal.promedio)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : selectedClase ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Haz clic en &quot;Generar Reporte&quot; para ver el analisis
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una clase para ver el rendimiento academico
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
