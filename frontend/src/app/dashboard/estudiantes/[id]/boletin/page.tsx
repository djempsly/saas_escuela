'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { estudiantesApi, ciclosApi, calificacionesApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  Download,
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

export default function BoletinEstudiantePage() {
  const params = useParams();
  const id = params.id as string;
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [selectedCiclo, setSelectedCiclo] = useState<string>('');
  const [boletin, setBoletin] = useState<Boletin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBoletin, setIsLoadingBoletin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [estRes, ciclosRes] = await Promise.all([
          estudiantesApi.getById(id),
          ciclosApi.getAll(),
        ]);
        setEstudiante(estRes.data?.data || estRes.data);
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
  }, [id]);

  useEffect(() => {
    const loadBoletin = async () => {
      if (!selectedCiclo || !id) return;

      setIsLoadingBoletin(true);
      try {
        const response = await calificacionesApi.getBoletin(id, selectedCiclo);
        setBoletin(response.data?.data || response.data);
      } catch (error) {
        console.error('Error cargando boletin:', error);
        setBoletin(null);
      } finally {
        setIsLoadingBoletin(false);
      }
    };
    loadBoletin();
  }, [id, selectedCiclo]);

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

  if (!estudiante) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Estudiante no encontrado</p>
        <Link href="/dashboard/estudiantes">
          <Button variant="link">Volver al listado</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/estudiantes/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Boletin de Calificaciones</h1>
          <p className="text-muted-foreground">
            {estudiante.nombre} {estudiante.apellido}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Seleccionar Ciclo</CardTitle>
          {boletin && (
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
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
        </CardContent>
      </Card>

      {isLoadingBoletin ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : boletin ? (
        <Card>
          <CardHeader>
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold">
                {boletin.estudiante.nombre} {boletin.estudiante.apellido}
              </h2>
              <p className="text-muted-foreground">
                {ciclos.find((c) => c.id === selectedCiclo)?.nombre}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Materia</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Calificacion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boletin.calificaciones.map((cal, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{cal.materia}</TableCell>
                    <TableCell>{cal.periodo}</TableCell>
                    <TableCell className="text-right">
                      {cal.calificacion !== null ? cal.calificacion.toFixed(1) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Promedio General</p>
                <p className="text-2xl font-bold text-primary">
                  {boletin.promedio.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay calificaciones registradas para este ciclo
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
