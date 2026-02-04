'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clasesApi, inscripcionesApi, sabanaApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  ArrowLeft,
  BookOpen,
  Users,
  ClipboardCheck,
  FileText,
  Loader2,
  Calendar,
  User,
  Hash,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { 
  BoletinIndividual, 
  SabanaData, 
  Estudiante as SabanaEstudiante, 
  Calificacion 
} from '../../sabana-notas/page';

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

export default function ClaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const claseId = params.id as string;
  const { user } = useAuthStore();

  const [clase, setClase] = useState<Clase | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'estudiantes' | 'calificaciones'>('estudiantes');

  // Sabana state
  const [sabanaData, setSabanaData] = useState<SabanaData | null>(null);
  const [loadingSabana, setLoadingSabana] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'boletin'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  const isDocente = user?.role === 'DOCENTE';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [claseRes, inscripcionesRes] = await Promise.all([
          clasesApi.getById(claseId),
          inscripcionesApi.getByClase(claseId),
        ]);

        setClase(claseRes.data?.data || claseRes.data);
        setInscripciones(inscripcionesRes.data?.data || inscripcionesRes.data || []);
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

  // Cargar sábana cuando se activa la pestaña y tenemos los datos de la clase
  useEffect(() => {
    const loadSabana = async () => {
      if (activeTab === 'calificaciones' && clase && !sabanaData && !loadingSabana) {
        setLoadingSabana(true);
        try {
          // Usamos el nivel y ciclo de la clase para cargar la sábana completa
          const response = await sabanaApi.getSabana(clase.nivel.id, clase.cicloLectivo.id);
          setSabanaData(response.data);
        } catch (error) {
          console.error('Error cargando sábana:', error);
        } finally {
          setLoadingSabana(false);
        }
      }
    };

    loadSabana();
  }, [activeTab, clase, sabanaData, loadingSabana]);

  // Filtrar estudiantes de la sábana para mostrar solo los de esta clase
  const estudiantesClase = useMemo(() => {
    if (!sabanaData || inscripciones.length === 0) return [];
    
    const inscritosIds = new Set(inscripciones.map(i => i.estudianteId));
    
    return sabanaData.estudiantes.filter(est => 
      inscritosIds.has(est.id) &&
      (est.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
       est.apellido.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sabanaData, inscripciones, searchTerm]);

  // Verificar si el docente puede editar
  const canEditMateria = useCallback((_materiaId: string, cal: Calificacion | undefined) => {
    if (!isDocente) return false;
    if (!cal) return false;
    // Permitir editar si es el docente de la clase actual (o si coincide el ID)
    return cal.docenteId === user?.id;
  }, [isDocente, user?.id]);

  const handleSaveCalificacion = async (
    claseId: string,
    estudianteId: string,
    periodo: string,
    valor: number | null
  ) => {
    await sabanaApi.updateCalificacion({
      claseId,
      estudianteId,
      periodo: periodo as 'p1' | 'p2' | 'p3' | 'p4' | 'rp1' | 'rp2' | 'rp3' | 'rp4',
      valor,
    });
    // Recargar datos en silencio? Idealmente actualizar estado local optimista o recargar
    // Por simplicidad, recargamos la sábana completa
    if (clase) {
        const response = await sabanaApi.getSabana(clase.nivel.id, clase.cicloLectivo.id);
        setSabanaData(response.data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clase) {
    return <div>Clase no encontrada</div>;
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
            <Link href={`/dashboard/sabana-notas?nivel=${clase.nivel.id}&ciclo=${clase.cicloLectivo.id}`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Sábana Completa (Todos los alumnos)
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
          Sábana de Notas
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
        <div className="space-y-4">
            {/* Contenido de Sábana de Notas */}
            {loadingSabana ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : sabanaData ? (
                <>
                    {viewMode === 'list' ? (
                        <Card>
                            <CardContent className="pt-4">
                                <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar estudiante..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                                
                                {estudiantesClase.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No se encontraron estudiantes para esta clase.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {estudiantesClase.map((est, idx) => (
                                            <button
                                                key={est.id}
                                                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                                                onClick={() => {
                                                    const originalIndex = sabanaData.estudiantes.findIndex(e => e.id === est.id);
                                                    setCurrentStudentIndex(originalIndex);
                                                    setViewMode('boletin');
                                                }}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                    {est.nombre[0]}{est.apellido[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {est.apellido.toUpperCase()}, {est.nombre}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Click para ver/editar boletín
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <BoletinIndividual
                            estudiante={sabanaData.estudiantes[currentStudentIndex]}
                            materias={sabanaData.materias}
                            sabanaData={sabanaData}
                            currentIndex={currentStudentIndex}
                            totalEstudiantes={sabanaData.estudiantes.length} // Note: This navigation might iterate over ALL students in level, not just filtered ones. This is okay for "Sábana" context.
                            onPrevious={() => currentStudentIndex > 0 && setCurrentStudentIndex(currentStudentIndex - 1)}
                            onNext={() => currentStudentIndex < sabanaData.estudiantes.length - 1 && setCurrentStudentIndex(currentStudentIndex + 1)}
                            onBack={() => setViewMode('list')}
                            onStudentChange={setCurrentStudentIndex}
                            estudiantes={sabanaData.estudiantes}
                            canEditMateria={canEditMateria}
                            onSaveCalificacion={handleSaveCalificacion}
                            isReadOnly={false}
                        />
                    )}
                </>
            ) : (
                <div className="py-12 text-center text-muted-foreground">
                    No se pudo cargar la sábana de notas.
                </div>
            )}
        </div>
      )}
    </div>
  );
}