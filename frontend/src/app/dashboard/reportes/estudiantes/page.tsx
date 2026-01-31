'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { clasesApi, nivelesApi, inscripcionesApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
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

interface Nivel {
  id: string;
  nombre: string;
}

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { id: string; nombre: string };
  docente: { nombre: string; apellido: string };
}

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  username: string;
}

export default function ReporteEstudiantesPage() {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [selectedNivel, setSelectedNivel] = useState<string>('');
  const [selectedClase, setSelectedClase] = useState<string>('');
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEstudiantes, setIsLoadingEstudiantes] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nivelesRes, clasesRes] = await Promise.all([
          nivelesApi.getAll(),
          clasesApi.getAll(),
        ]);
        setNiveles(nivelesRes.data?.data || nivelesRes.data || []);
        setClases(clasesRes.data?.data || clasesRes.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const clasesFiltradasPorNivel = selectedNivel
    ? clases.filter((c) => c.nivel.id === selectedNivel)
    : clases;

  const cargarEstudiantes = async () => {
    if (!selectedClase) return;

    setIsLoadingEstudiantes(true);
    try {
      const response = await inscripcionesApi.getByClase(selectedClase);
      const inscripciones = response.data?.data || response.data || [];
      // Extract students from inscriptions
      const estudiantesData = inscripciones.map((insc: { estudiante: Estudiante }) => insc.estudiante);
      setEstudiantes(estudiantesData);
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
      setEstudiantes([]);
    } finally {
      setIsLoadingEstudiantes(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportarCSV = () => {
    if (estudiantes.length === 0) return;

    const headers = ['Nombre', 'Apellido', 'Usuario', 'Email'];
    const rows = estudiantes.map((e) => [
      e.nombre,
      e.apellido,
      e.username,
      e.email || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'listado_estudiantes.csv';
    link.click();
  };

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
          <h1 className="text-2xl font-bold">Listado de Estudiantes</h1>
          <p className="text-muted-foreground">
            Exporta listados por nivel o clase
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
              <Label>Nivel (opcional)</Label>
              <Select value={selectedNivel} onValueChange={(v) => {
                setSelectedNivel(v === 'all' ? '' : v);
                setSelectedClase('');
                setEstudiantes([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los niveles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  {niveles.map((nivel) => (
                    <SelectItem key={nivel.id} value={nivel.id}>
                      {nivel.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clase</Label>
              <Select value={selectedClase} onValueChange={(v) => {
                setSelectedClase(v);
                setEstudiantes([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar clase" />
                </SelectTrigger>
                <SelectContent>
                  {clasesFiltradasPorNivel.map((clase) => (
                    <SelectItem key={clase.id} value={clase.id}>
                      {clase.materia.nombre} - {clase.nivel.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={cargarEstudiantes}
                disabled={!selectedClase}
                className="w-full"
              >
                Cargar Listado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoadingEstudiantes ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : estudiantes.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {claseSeleccionada?.materia.nombre} - {claseSeleccionada?.nivel.nombre}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {estudiantes.length} estudiantes
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportarCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Apellido</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudiantes.map((est, idx) => (
                  <TableRow key={est.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{est.nombre}</TableCell>
                    <TableCell>{est.apellido}</TableCell>
                    <TableCell className="text-muted-foreground">@{est.username}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {est.email || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : selectedClase ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Haz clic en &quot;Cargar Listado&quot; para ver los estudiantes
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una clase para ver el listado de estudiantes
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
