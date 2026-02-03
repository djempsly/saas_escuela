'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { estudiantesApi, ciclosApi, calificacionesApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Search,
  FileText,
  Download,
  Users,
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

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
}

interface Ciclo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface Calificacion {
  materia: string;
  calificacion: number | null;
  periodo: string;
}

interface Boletin {
  estudiante: {
    nombre: string;
    apellido: string;
  };
  calificaciones: Calificacion[];
  promedio: number;
}

export default function ReporteBoletinesPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [selectedCiclo, setSelectedCiclo] = useState<string>('');
  const [selectedEstudiante, setSelectedEstudiante] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [boletin, setBoletin] = useState<Boletin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBoletin, setIsLoadingBoletin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [estRes, ciclosRes] = await Promise.all([
          estudiantesApi.getAll(),
          ciclosApi.getAll(),
        ]);
        setEstudiantes(estRes.data?.data || estRes.data || []);
        const ciclosData = ciclosRes.data?.data || ciclosRes.data || [];
        setCiclos(ciclosData);

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

  const filteredEstudiantes = estudiantes.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadBoletin = async (estudianteId: string) => {
    if (!selectedCiclo || !estudianteId) return;

    setIsLoadingBoletin(true);
    try {
      const response = await calificacionesApi.getBoletin(estudianteId, selectedCiclo);
      const data = response.data?.data || response.data;
      // Asegurar que el boletín tenga estructura correcta
      if (data) {
        setBoletin({
          ...data,
          calificaciones: Array.isArray(data.calificaciones) ? data.calificaciones : [],
          promedio: data.promedio ?? 0,
        });
      } else {
        setBoletin(null);
      }
    } catch (error) {
      console.error('Error cargando boletin:', error);
      setBoletin(null);
    } finally {
      setIsLoadingBoletin(false);
    }
  };

  const handleSelectEstudiante = (id: string) => {
    setSelectedEstudiante(id);
    loadBoletin(id);
  };

  const handlePrint = () => {
    window.print();
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
          <h1 className="text-2xl font-bold">Boletines de Calificaciones</h1>
          <p className="text-muted-foreground">
            Genera boletines individuales
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Panel izquierdo - Seleccin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Estudiante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Buscar Estudiante</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o apellido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {filteredEstudiantes.length > 0 ? (
                filteredEstudiantes.map((est) => (
                  <div
                    key={est.id}
                    className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                      selectedEstudiante === est.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => handleSelectEstudiante(est.id)}
                  >
                    <p className="font-medium">
                      {est.nombre} {est.apellido}
                    </p>
                    <p className="text-xs text-muted-foreground">@{est.username}</p>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-muted-foreground text-sm">
                  No hay estudiantes
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel derecho - Boletn */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Boletn de Calificaciones</CardTitle>
            {boletin && (
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingBoletin ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : boletin ? (
              <div className="space-y-4 print:p-4" id="boletin-content">
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold">
                    {boletin.estudiante.nombre} {boletin.estudiante.apellido}
                  </h2>
                  <p className="text-muted-foreground">
                    {ciclos.find(c => c.id === selectedCiclo)?.nombre}
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Materia</TableHead>
                      <TableHead>Perodo</TableHead>
                      <TableHead className="text-right">Calificacin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boletin.calificaciones.length > 0 ? (
                      boletin.calificaciones.map((cal, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{cal.materia}</TableCell>
                          <TableCell>{cal.periodo}</TableCell>
                          <TableCell className="text-right">
                            {cal.calificacion !== null && cal.calificacion !== undefined
                              ? cal.calificacion.toFixed(1)
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No hay calificaciones registradas para este ciclo
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex justify-end border-t pt-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Promedio General</p>
                    <p className="text-2xl font-bold text-primary">
                      {(boletin.promedio ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecciona un estudiante para ver su boletn
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
