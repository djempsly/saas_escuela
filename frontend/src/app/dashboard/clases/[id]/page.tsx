'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clasesApi, inscripcionesApi, sabanaApi, calificacionesApi } from '@/lib/api';
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
  const isEstudianteInit = user?.role === 'ESTUDIANTE';
  const [activeTab, setActiveTab] = useState<'estudiantes' | 'calificaciones'>(isEstudianteInit ? 'calificaciones' : 'estudiantes');

  // Sabana state
  const [sabanaData, setSabanaData] = useState<SabanaData | null>(null);
  const [loadingSabana, setLoadingSabana] = useState(false);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'boletin'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para calificaciones del estudiante
  const [misCalificaciones, setMisCalificaciones] = useState<any>(null);
  const [loadingMisCalificaciones, setLoadingMisCalificaciones] = useState(false);

  const isDocente = user?.role === 'DOCENTE';
  const isEstudiante = user?.role === 'ESTUDIANTE';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const claseRes = await clasesApi.getById(claseId);
        setClase(claseRes.data?.data || claseRes.data);

        // Estudiantes no tienen acceso a ver inscripciones de la clase
        if (!isEstudiante) {
          const inscripcionesRes = await inscripcionesApi.getByClase(claseId);
          setInscripciones(inscripcionesRes.data?.data || inscripcionesRes.data || []);
        }
      } catch (error) {
        console.error('Error cargando clase:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (claseId) {
      fetchData();
    }
  }, [claseId, isEstudiante]);

  // Cargar sábana cuando se activa la pestaña (solo docente/admin)
  useEffect(() => {
    const loadSabana = async () => {
      if (activeTab === 'calificaciones' && clase && !sabanaData && !loadingSabana && !isEstudiante) {
        setLoadingSabana(true);
        try {
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
  }, [activeTab, clase, sabanaData, loadingSabana, isEstudiante]);

  // Cargar calificaciones del estudiante
  useEffect(() => {
    const loadMisCalificaciones = async () => {
      if (activeTab === 'calificaciones' && isEstudiante && !misCalificaciones && !loadingMisCalificaciones) {
        setLoadingMisCalificaciones(true);
        try {
          const res = await calificacionesApi.getMisCalificaciones();
          const data = res.data?.data || res.data || {};
          // Filtrar solo la calificación de esta clase
          const cals = data.calificaciones || data || [];
          const calClase = Array.isArray(cals)
            ? cals.find((c: any) => c.claseId === claseId || c.clase?.id === claseId)
            : null;
          // Competencias de esta clase
          const comps = data.calificacionesCompetencia || [];
          const compsClase = Array.isArray(comps)
            ? comps.filter((c: any) => c.claseId === claseId || c.clase?.id === claseId)
            : [];
          setMisCalificaciones({ calificacion: calClase, competencias: compsClase });
        } catch (error) {
          console.error('Error cargando mis calificaciones:', error);
        } finally {
          setLoadingMisCalificaciones(false);
        }
      }
    };

    loadMisCalificaciones();
  }, [activeTab, isEstudiante, misCalificaciones, loadingMisCalificaciones, claseId]);

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
      <div className={`grid gap-4 ${isEstudiante ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
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

        {!isEstudiante && (
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
        )}

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

      {/* Quick Actions (solo para docentes/admin, NO estudiantes) */}
      {!isEstudiante && (
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
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {!isEstudiante && (
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
        )}
        <button
          onClick={() => setActiveTab('calificaciones')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'calificaciones'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          {isEstudiante ? 'Mis Calificaciones' : 'Sábana de Notas'}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'estudiantes' && !isEstudiante ? (
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
      ) : activeTab === 'calificaciones' && isEstudiante ? (
        /* Vista de calificaciones del estudiante */
        <div className="space-y-4">
          {loadingMisCalificaciones ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : misCalificaciones?.calificacion ? (
            <>
              {/* Calificaciones generales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas por Período</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-medium">Período</th>
                        <th className="text-center p-3 font-medium">Nota</th>
                        <th className="text-center p-3 font-medium bg-amber-50">Recuperación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['p1', 'p2', 'p3', 'p4'].map((periodo, idx) => {
                        const cal = misCalificaciones.calificacion;
                        const nota = cal[periodo] as number | null;
                        const rp = cal[`r${periodo}`] as number | null;
                        const notaColor = nota != null ? (nota >= 70 ? 'text-green-600' : nota >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-muted-foreground';
                        const rpColor = rp != null ? (rp >= 70 ? 'text-green-600' : rp >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-muted-foreground';
                        return (
                          <tr key={periodo} className="border-t">
                            <td className="p-3 font-medium">Período {idx + 1}</td>
                            <td className={`text-center p-3 font-semibold ${notaColor}`}>{nota ?? '-'}</td>
                            <td className={`text-center p-3 bg-amber-50 ${rpColor}`}>{rp ?? '-'}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t bg-slate-50">
                        <td className="p-3 font-bold">Promedio Final</td>
                        <td colSpan={2} className={`text-center p-3 font-bold text-lg ${
                          misCalificaciones.calificacion.promedioFinal != null
                            ? misCalificaciones.calificacion.promedioFinal >= 70 ? 'text-green-600' : 'text-red-600'
                            : 'text-muted-foreground'
                        }`}>
                          {misCalificaciones.calificacion.promedioFinal != null
                            ? Number(misCalificaciones.calificacion.promedioFinal).toFixed(1)
                            : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Competencias si existen */}
              {misCalificaciones.competencias && misCalificaciones.competencias.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notas por Competencia</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Competencia</th>
                          <th className="text-center p-2 font-medium w-14">P1</th>
                          <th className="text-center p-2 font-medium w-14">P2</th>
                          <th className="text-center p-2 font-medium w-14">P3</th>
                          <th className="text-center p-2 font-medium w-14">P4</th>
                        </tr>
                      </thead>
                      <tbody>
                        {misCalificaciones.competencias.map((comp: any, idx: number) => {
                          const COMP_NAMES: Record<string, string> = {
                            COMUNICATIVA: 'Comunicativa',
                            LOGICO: 'Pensamiento Lógico',
                            CIENTIFICO: 'Científica y Tecnológica',
                            ETICO: 'Ética y Ciudadana',
                            DESARROLLO: 'Desarrollo Personal',
                          };
                          return (
                            <tr key={idx} className="border-t">
                              <td className="p-3 font-medium">{COMP_NAMES[comp.competencia] || comp.competencia}</td>
                              {['p1', 'p2', 'p3', 'p4'].map((p) => {
                                const val = comp[p] as number | null;
                                const color = val != null ? (val >= 70 ? 'text-green-600' : val >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-muted-foreground';
                                return (
                                  <td key={p} className={`text-center p-2 ${color}`}>{val ?? '-'}</td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay calificaciones publicadas para esta materia</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : activeTab === 'calificaciones' ? (
        /* Vista sábana para docentes/admin */
        <div className="space-y-4">
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
                                        {estudiantesClase.map((est) => (
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
                            totalEstudiantes={sabanaData.estudiantes.length}
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
      ) : null}
    </div>
  );
}