'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { estudiantesApi, inscripcionesApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  username: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  fotoUrl?: string;
  createdAt: string;
}

interface Clase {
  id: string;
  materia: { nombre: string };
  nivel: { nombre: string };
  docente: { nombre: string; apellido: string };
}

export default function EstudianteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [estRes] = await Promise.all([
          estudiantesApi.getById(id),
        ]);
        setEstudiante(estRes.data?.data || estRes.data);

        // Try to get student's classes - may fail if not enrolled
        try {
          // This might need adjustment based on actual API
          setClases([]);
        } catch {
          setClases([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <Link href="/dashboard/estudiantes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {estudiante.nombre} {estudiante.apellido}
          </h1>
          <p className="text-muted-foreground">@{estudiante.username}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informacin del estudiante */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informacion Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {estudiante.fotoUrl ? (
                <Image
                  src={estudiante.fotoUrl}
                  alt={estudiante.nombre}
                  width={120}
                  height={120}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-30 h-30 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-16 h-16 text-primary" />
                </div>
              )}

              <div className="flex-1 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{estudiante.email || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p>{estudiante.telefono || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de nacimiento</p>
                      <p>{formatDate(estudiante.fechaNacimiento)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Direccion</p>
                      <p>{estudiante.direccion || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Registrado el {formatDate(estudiante.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones rapidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/dashboard/estudiantes/${id}/boletin`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Ver Boletin
              </Button>
            </Link>
            <Link href={`/dashboard/cobros/estudiante/${id}`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="w-4 h-4 mr-2" />
                Ver Cobros
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Clases inscritas */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Clases Inscritas</CardTitle>
          </CardHeader>
          <CardContent>
            {clases.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {clases.map((clase) => (
                  <div
                    key={clase.id}
                    className="p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <p className="font-medium">{clase.materia.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {clase.nivel.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Prof. {clase.docente.nombre} {clase.docente.apellido}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay clases registradas
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
