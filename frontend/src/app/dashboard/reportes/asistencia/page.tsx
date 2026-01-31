'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clasesApi, asistenciaApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Download,
  ClipboardCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
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

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { nombre: string };
  docente: { nombre: string; apellido: string };
}

interface ReporteAsistencia {
  estudiante: {
    nombre: string;
    apellido: string;
  };
  totalClases: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  porcentajeAsistencia: number;
}

export default function ReporteAsistenciaPage() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [selectedClase, setSelectedClase] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [reporte, setReporte] = useState<ReporteAsistencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReporte, setIsLoadingReporte] = useState(false);

  useEffect(() => {
    const fetchClases = async () => {
      try {
        const response = await clasesApi.getAll();
        setClases(response.data?.data || response.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClases();

    // Default dates: last month
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    setFechaInicio(mesAnterior.toISOString().split('T')[0]);
    setFechaFin(hoy.toISOString().split('T')[0]);
  }, []);

  const generarReporte = async () => {
    if (!selectedClase || !fechaInicio || !fechaFin) return;

    setIsLoadingReporte(true);
    try {
      const response = await asistenciaApi.getReporteClase(
        selectedClase,
        fechaInicio,
        fechaFin
      );
      setReporte(response.data?.data || response.data || []);
    } catch (error) {
      console.error('Error generando reporte:', error);
      setReporte([]);
    } finally {
      setIsLoadingReporte(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getAsistenciaColor = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-green-600';
    if (porcentaje >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reportes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Reporte de Asistencia</h1>
          <p className="text-muted-foreground">
            Estadisticas de asistencia por clase
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Clase</Label>
              <Select value={selectedClase} onValueChange={setSelectedClase}>
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

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={generarReporte}
                disabled={!selectedClase || !fechaInicio || !fechaFin}
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
      ) : reporte.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Resultados</CardTitle>
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
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">
                    <CheckCircle2 className="w-4 h-4 inline text-green-600" /> Presentes
                  </TableHead>
                  <TableHead className="text-center">
                    <XCircle className="w-4 h-4 inline text-red-600" /> Ausentes
                  </TableHead>
                  <TableHead className="text-center">
                    <Clock className="w-4 h-4 inline text-yellow-600" /> Tardanzas
                  </TableHead>
                  <TableHead className="text-center">% Asistencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reporte.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {r.estudiante.nombre} {r.estudiante.apellido}
                    </TableCell>
                    <TableCell className="text-center">{r.totalClases}</TableCell>
                    <TableCell className="text-center text-green-600">
                      {r.presentes}
                    </TableCell>
                    <TableCell className="text-center text-red-600">
                      {r.ausentes}
                    </TableCell>
                    <TableCell className="text-center text-yellow-600">
                      {r.tardanzas}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${getAsistenciaColor(r.porcentajeAsistencia)}`}>
                        {r.porcentajeAsistencia.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : selectedClase && fechaInicio && fechaFin ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Haz clic en &quot;Generar Reporte&quot; para ver los resultados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una clase y un rango de fechas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
