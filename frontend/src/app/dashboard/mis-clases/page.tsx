'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { inscripcionesApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { GraduationCap, Loader2, Users, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

interface Clase {
  id: string;
  codigo: string;
  materia: { nombre: string };
  nivel: { nombre: string };
  docente: { nombre: string; apellido: string };
  _count?: { inscripciones: number };
}

export default function MisClasesPage() {
  const { user } = useAuthStore();
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.role === 'DOCENTE') {
          // Para docentes, obtener sus clases asignadas
          const response = await clasesApi.getAll();
          setClases(response.data.data || response.data || []);
        } else {
          // Para estudiantes, obtener clases inscritas
          // La API devuelve inscripciones con clase anidada, extraer el objeto clase
          const response = await inscripcionesApi.getMisClases();
          const inscripciones = response.data.data || response.data || [];
          const clasesFromInscripciones = inscripciones
            .map((insc: Record<string, unknown>) => insc.clase)
            .filter(Boolean);
          setClases(clasesFromInscripciones);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user?.role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Clases</h1>
        <p className="text-muted-foreground">
          {user?.role === 'DOCENTE' ? 'Clases que impartes' : 'Clases en las que estás inscrito'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : clases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clases.map((clase) => (
            <Card key={clase.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                    {clase.codigo}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1">{clase.materia?.nombre}</h3>
                <p className="text-sm text-muted-foreground mb-3">{clase.nivel?.nombre}</p>
                {user?.role !== 'DOCENTE' && clase.docente && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Docente:</span>{' '}
                    {clase.docente.nombre} {clase.docente.apellido}
                  </p>
                )}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Link href={`/dashboard/clases/${clase.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Detalles
                    </Button>
                  </Link>
                  {user?.role === 'DOCENTE' && (
                    <Link href={`/dashboard/asistencia?clase=${clase.id}`}>
                      <Button size="sm">Asistencia</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin clases asignadas</h3>
            <p className="text-muted-foreground">
              {user?.role === 'ESTUDIANTE'
                ? 'No estás inscrito en ninguna clase aún'
                : 'No tienes clases asignadas'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
