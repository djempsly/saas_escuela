'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clasesApi, inscripcionesApi, calificacionesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  ArrowLeft,
  BookOpen,
  Users,
  ClipboardCheck,
  FileText,
  Loader2,
  GraduationCap,
  Calendar,
  User,
  Hash,
} from 'lucide-react';
import Link from 'next/link';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  username: string;
  fotoUrl?: string;
}

interface Inscripcion {
  id: string;
  estudianteId: string;
  estudiante: Estudiante;
  fecha: string;
}

interface Clase {
  id: string;
  codigo: string;
  materia: { id: string; nombre: string };
  nivel: { id: string; nombre: string };
  docente: { id: string; nombre: string; apellido: string };
  cicloLectivo: { id: string; nombre: string };
}

interface Calificacion {
  estudianteId: string;
  estudiante: { nombre: string; apellido: string };
  p1?: number | null;
  p2?: number | null;
  p3?: number | null;
  p4?: number | null;
  promedioFinal?: number | null;
}

export default function ClaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claseId = params.id as string;
  const { user } = useAuthStore();

  const [clase, setClase] = useState<Clase | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'estudiantes' | 'calificaciones'>('estudiantes');

  const isDocente = user?.role === 'DOCENTE';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'DIRECTOR';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [claseRes, inscripcionesRes, calificacionesRes] = await Promise.all([
          clasesApi.getById(claseId),
          inscripcionesApi.getByClase(claseId),
          calificacionesApi.getByClase(claseId),
        ]);

        setClase(claseRes.data?.data || claseRes.data);
        setInscripciones(inscripcionesRes.data?.data || inscripcionesRes.data || []);
        setCalificaciones(calificacionesRes.data?.data || calificacionesRes.data || []);
      } catch (error) {
        console.error('Error cargando clase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (claseId) {
      fetchData();
    }
  }, [claseId]);

  const getNotaColor = (nota: number | null | undefined) => {
    if (nota === null || nota === undefined) return 'text-muted-foreground';
    if (nota >= 70) return 'text-green-600';
    if (nota >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clase) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Clase no encontrada</h3>
            <p className="text-muted-foreground mb-4">
              La clase que buscas no existe o no tienes acceso
            </p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{clase.materia.nombre}</h1>
          <p className="text-muted-foreground">{clase.nivel.nombre}</p>
        </div>
        <span className="text-sm font-mono bg-slate-100 px-3 py-1 rounded">
          {clase.codigo}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Docente</p>
                <p className="font-medium">{clase.docente.nombre} {clase.docente.apellido}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estudiantes</p>
                <p className="font-medium">{inscripciones.length} inscritos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ciclo Lectivo</p>
                <p className="font-medium">{clase.cicloLectivo.nombre}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Codigo</p>
                <p className="font-medium font-mono">{clase.codigo}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/asistencia?clase=${claseId}`}>
              <Button variant="outline">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Tomar Asistencia
              </Button>
            </Link>
            <Link href={`/dashboard/calificaciones`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Sabana de Notas
              </Button>
            </Link>
            <Link href={`/dashboard/tareas?claseId=${claseId}`}>
              <Button variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                Tareas
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('estudiantes')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'estudiantes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Estudiantes ({inscripciones.length})
        </button>
        <button
          onClick={() => setActiveTab('calificaciones')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'calificaciones'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Sabana de Notas
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'estudiantes' ? (
        <Card>
          <CardContent className="p-0">
            {inscripciones.length > 0 ? (
              <div className="divide-y">
                {inscripciones.map((insc, idx) => (
                  <div key={insc.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                    <span className="w-8 text-center text-sm text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                      {insc.estudiante.nombre[0]}{insc.estudiante.apellido[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {insc.estudiante.nombre} {insc.estudiante.apellido}
                      </p>
                      <p className="text-sm text-muted-foreground">@{insc.estudiante.username}</p>
                    </div>
                    <Link href={`/dashboard/estudiantes/${insc.estudianteId}`}>
                      <Button variant="ghost" size="sm">
                        Ver Perfil
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay estudiantes inscritos</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {calificaciones.length > 0 ? (
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-medium">#</th>
                    <th className="text-left p-4 font-medium">Estudiante</th>
                    <th className="text-center p-4 font-medium w-20">P1</th>
                    <th className="text-center p-4 font-medium w-20">P2</th>
                    <th className="text-center p-4 font-medium w-20">P3</th>
                    <th className="text-center p-4 font-medium w-20">P4</th>
                    <th className="text-center p-4 font-medium w-24 bg-slate-100">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {calificaciones.map((cal, idx) => (
                    <tr key={cal.estudianteId} className="border-t hover:bg-slate-50">
                      <td className="p-4 text-muted-foreground">{idx + 1}</td>
                      <td className="p-4 font-medium">
                        {cal.estudiante?.nombre} {cal.estudiante?.apellido}
                      </td>
                      <td className={`text-center p-4 ${getNotaColor(cal.p1)}`}>
                        {cal.p1 ?? '-'}
                      </td>
                      <td className={`text-center p-4 ${getNotaColor(cal.p2)}`}>
                        {cal.p2 ?? '-'}
                      </td>
                      <td className={`text-center p-4 ${getNotaColor(cal.p3)}`}>
                        {cal.p3 ?? '-'}
                      </td>
                      <td className={`text-center p-4 ${getNotaColor(cal.p4)}`}>
                        {cal.p4 ?? '-'}
                      </td>
                      <td className={`text-center p-4 font-bold bg-slate-50 ${getNotaColor(cal.promedioFinal)}`}>
                        {cal.promedioFinal?.toFixed(1) ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No hay calificaciones registradas</p>
                <Link href="/dashboard/calificaciones">
                  <Button>Ir a Sabana de Notas</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend for grades */}
      {activeTab === 'calificaciones' && calificaciones.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span> 70-100: Aprobado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500"></span> 60-69: En riesgo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500"></span> 0-59: Reprobado
          </span>
        </div>
      )}
    </div>
  );
}
