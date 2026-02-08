'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { asistenciaApi, clasesApi, ciclosApi, eventosApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  ClipboardCheck,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  Settings,
  BarChart3,
  X,
  ArrowLeft,
  Calendar,
} from 'lucide-react';

const ESTADOS = [
  { value: 'PRESENTE', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'P' },
  { value: 'AUSENTE', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'A' },
  { value: 'TARDE', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'T' },
  { value: 'JUSTIFICADO', icon: AlertCircle, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'J' },
];

const MESES = [
  { key: 'agosto', label: 'Agosto' },
  { key: 'septiembre', label: 'Septiembre' },
  { key: 'octubre', label: 'Octubre' },
  { key: 'noviembre', label: 'Noviembre' },
  { key: 'diciembre', label: 'Diciembre' },
  { key: 'enero', label: 'Enero' },
  { key: 'febrero', label: 'Febrero' },
  { key: 'marzo', label: 'Marzo' },
  { key: 'abril', label: 'Abril' },
  { key: 'mayo', label: 'Mayo' },
  { key: 'junio', label: 'Junio' },
];

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl?: string;
}

interface AsistenciaItem {
  estudianteId: string;
  estudiante: Estudiante;
  estado: string | null;
}

interface DiasLaborables {
  agosto: number;
  septiembre: number;
  octubre: number;
  noviembre: number;
  diciembre: number;
  enero: number;
  febrero: number;
  marzo: number;
  abril: number;
  mayo: number;
  junio: number;
}

interface EstadisticaEstudiante {
  estudianteId: string;
  estudiante: { nombre: string; apellido: string };
  presentes: number;
  ausentes: number;
  tardes: number;
  justificados: number;
  totalAsistencias: number;
  porcentajeAsistencia: number;
}

interface Ciclo {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function AsistenciaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const claseIdFromUrl = searchParams.get('clase');

  const { user } = useAuthStore();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [clases, setClases] = useState<any[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [claseInfo, setClaseInfo] = useState<{ materia: string; nivel: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClase, setSelectedClase] = useState(claseIdFromUrl || '');
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');

  // Dias laborables state
  const [showDiasModal, setShowDiasModal] = useState(false);
  const [diasLaborables, setDiasLaborables] = useState<DiasLaborables>({
    agosto: 0, septiembre: 0, octubre: 0, noviembre: 0, diciembre: 0,
    enero: 0, febrero: 0, marzo: 0, abril: 0, mayo: 0, junio: 0,
  });
  const [isSavingDias, setIsSavingDias] = useState(false);

  // Estadisticas state
  const [showEstadisticas, setShowEstadisticas] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticaEstudiante[]>([]);
  const [totalDiasLaborables, setTotalDiasLaborables] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [feriados, setFeriados] = useState<{ id: string; titulo: string; fechaInicio: string; fechaFin: string }[]>([]);
  const [fechaError, setFechaError] = useState<string>('');

  const isDocente = user?.role === 'DOCENTE';
  const canEdit = isDocente;

  // Validar si una fecha es fin de semana o feriado
  const validarFecha = (dateStr: string): string => {
    const fecha = new Date(dateStr + 'T12:00:00');
    const dia = fecha.getDay();
    if (dia === 0) return 'No se puede registrar asistencia en día domingo';
    if (dia === 6) return 'No se puede registrar asistencia en día sábado';

    // Verificar feriados
    const fechaMs = fecha.getTime();
    const feriadoEncontrado = feriados.find(f => {
      const inicio = new Date(f.fechaInicio).getTime();
      const fin = new Date(f.fechaFin).getTime();
      return fechaMs >= inicio && fechaMs <= fin;
    });
    if (feriadoEncontrado) {
      return `Día feriado: ${feriadoEncontrado.titulo}`;
    }

    return '';
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [clasesRes, ciclosRes] = await Promise.all([
          clasesApi.getAll(),
          ciclosApi.getAll(),
        ]);
        setClases(clasesRes.data.data || clasesRes.data || []);
        const ciclosData = ciclosRes.data.data || ciclosRes.data || [];
        setCiclos(ciclosData);

        // Set active cycle as default
        const cicloActivo = ciclosData.find((c: Ciclo) => c.activo);
        if (cicloActivo) {
          setSelectedCiclo(cicloActivo.id);
        }

        // Cargar feriados del año actual
        const year = new Date().getFullYear();
        try {
          const feriadosRes = await eventosApi.getFeriados(
            `${year}-01-01`,
            `${year}-12-31`
          );
          setFeriados(feriadosRes.data || []);
        } catch (error) {
          console.error('Error cargando feriados:', error);
        }

        // Validar fecha inicial
        const initialError = validarFecha(new Date().toISOString().split('T')[0]);
        if (initialError) {
          setFechaError(initialError);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (claseIdFromUrl) {
      loadAsistenciaClase(claseIdFromUrl);
    }
  }, [claseIdFromUrl]);

  const loadAsistenciaClase = async (claseId: string) => {
    if (!claseId) {
      setAsistencias([]);
      setClaseInfo(null);
      return;
    }
    setSelectedClase(claseId);
    const error = validarFecha(selectedDate);
    setFechaError(error);
    if (error) {
      setAsistencias([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await asistenciaApi.getByClase(claseId, selectedDate);
      const data = response.data;
      setAsistencias(data.asistencias || []);
      setClaseInfo(data.clase || null);
    } catch (error) {
      console.error('Error:', error);
      setAsistencias([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    const error = validarFecha(date);
    setFechaError(error);

    if (error) {
      setAsistencias([]);
      return;
    }

    if (selectedClase) {
      setIsLoading(true);
      try {
        const response = await asistenciaApi.getByClase(selectedClase, date);
        const data = response.data;
        setAsistencias(data.asistencias || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleEstado = (estudianteId: string, nuevoEstado: string) => {
    if (!canEdit) return;
    setAsistencias(prev => prev.map(a => {
      if (a.estudianteId === estudianteId) {
        return { ...a, estado: a.estado === nuevoEstado ? null : nuevoEstado };
      }
      return a;
    }));
  };

  const guardarAsistencia = async () => {
    const asistenciasParaGuardar = asistencias
      .filter(a => a.estado !== null)
      .map(a => ({ estudianteId: a.estudianteId, estado: a.estado as string }));

    if (asistenciasParaGuardar.length === 0) {
      alert('No hay asistencias para guardar');
      return;
    }

    setIsSaving(true);
    try {
      await asistenciaApi.tomar(selectedClase, selectedDate, asistenciasParaGuardar);
      setSuccessMessage('Asistencia guardada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Error al guardar asistencia');
    } finally {
      setIsSaving(false);
    }
  };

  const marcarTodos = (estado: string) => {
    if (!canEdit) return;
    setAsistencias(prev => prev.map(a => ({ ...a, estado })));
  };

  // Load dias laborables
  const loadDiasLaborables = async () => {
    if (!selectedClase || !selectedCiclo) return;
    try {
      const response = await asistenciaApi.getDiasLaborables(selectedClase, selectedCiclo);
      setDiasLaborables(response.data.data || {
        agosto: 0, septiembre: 0, octubre: 0, noviembre: 0, diciembre: 0,
        enero: 0, febrero: 0, marzo: 0, abril: 0, mayo: 0, junio: 0,
      });
    } catch (error) {
      console.error('Error loading dias laborables:', error);
    }
  };

  const openDiasModal = async () => {
    await loadDiasLaborables();
    setShowDiasModal(true);
  };

  const saveDiasLaborables = async () => {
    if (!selectedClase || !selectedCiclo) return;
    setIsSavingDias(true);
    try {
      await asistenciaApi.saveDiasLaborables(selectedClase, selectedCiclo, diasLaborables);
      setSuccessMessage('Dias laborables guardados');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowDiasModal(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSavingDias(false);
    }
  };

  // Load estadisticas
  const loadEstadisticas = async () => {
    if (!selectedClase || !selectedCiclo) return;
    setIsLoadingStats(true);
    try {
      const response = await asistenciaApi.getEstadisticas(selectedClase, selectedCiclo);
      const data = response.data.data;
      setEstadisticas(data.estadisticas || []);
      setTotalDiasLaborables(data.totalDiasLaborables || 0);
      setShowEstadisticas(true);
    } catch (error) {
      console.error('Error loading estadisticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleDiaChange = (mes: string, value: string) => {
    const num = parseInt(value) || 0;
    setDiasLaborables(prev => ({
      ...prev,
      [mes]: Math.max(0, Math.min(31, num)),
    }));
  };

  const getTotalDiasConfig = () => {
    return MESES.reduce((total, mes) => {
      const val = diasLaborables[mes.key as keyof DiasLaborables];
      return total + (typeof val === 'number' ? val : 0);
    }, 0);
  };

  // Estadisticas
  const stats = {
    presentes: asistencias.filter(a => a.estado === 'PRESENTE').length,
    ausentes: asistencias.filter(a => a.estado === 'AUSENTE').length,
    tardes: asistencias.filter(a => a.estado === 'TARDE').length,
    justificados: asistencias.filter(a => a.estado === 'JUSTIFICADO').length,
    sinMarcar: asistencias.filter(a => a.estado === null).length,
  };

  const getPorcentajeColor = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-green-600 bg-green-50';
    if (porcentaje >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Asistencia</h1>
            <p className="text-muted-foreground">
              {canEdit ? 'Registra la asistencia de tu clase' : 'Consulta la asistencia'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedClase && selectedCiclo && (
            <>
              <Button variant="outline" onClick={openDiasModal}>
                <Settings className="w-4 h-4 mr-2" />
                Dias Laborables
              </Button>
              <Button variant="outline" onClick={loadEstadisticas} disabled={isLoadingStats}>
                {isLoadingStats ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Ver Porcentajes
              </Button>
            </>
          )}
          {canEdit && selectedClase && asistencias.length > 0 && (
            <Button onClick={guardarAsistencia} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md">
          {successMessage}
        </div>
      )}

      {fechaError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {fechaError}
        </div>
      )}

      {/* Selector de clase, ciclo y fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Clase, Ciclo y Fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={selectedClase}
              onChange={(e) => loadAsistenciaClase(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value="">-- Seleccionar clase --</option>
              {clases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.materia?.nombre} - {c.nivel?.nombre}
                </option>
              ))}
            </select>
            <select
              value={selectedCiclo}
              onChange={(e) => setSelectedCiclo(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="">-- Ciclo lectivo --</option>
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.activo && '(Activo)'}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Info de clase y botones rapidos */}
      {claseInfo && asistencias.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{claseInfo.materia} - {claseInfo.nivel}</h3>
                <p className="text-sm text-muted-foreground">{asistencias.length} estudiantes</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => marcarTodos('PRESENTE')}>
                    Todos presentes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => marcarTodos('AUSENTE')}>
                    Todos ausentes
                  </Button>
                </div>
              )}
            </div>
            {/* Estadisticas */}
            <div className="flex gap-4 mt-4 text-sm">
              <span className="text-green-600">P: {stats.presentes}</span>
              <span className="text-red-600">A: {stats.ausentes}</span>
              <span className="text-yellow-600">T: {stats.tardes}</span>
              <span className="text-blue-600">J: {stats.justificados}</span>
              <span className="text-muted-foreground">Sin marcar: {stats.sinMarcar}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de estudiantes */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : asistencias.length > 0 ? (
        <div className="space-y-2">
          {asistencias.map((asist) => (
            <Card key={asist.estudianteId} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                      {asist.estudiante.nombre[0]}{asist.estudiante.apellido[0]}
                    </div>
                    <div>
                      <p className="font-medium">{asist.estudiante.nombre} {asist.estudiante.apellido}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {ESTADOS.map((estado) => {
                      const isSelected = asist.estado === estado.value;
                      const Icon = estado.icon;
                      return (
                        <button
                          key={estado.value}
                          onClick={() => toggleEstado(asist.estudianteId, estado.value)}
                          disabled={!canEdit}
                          className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? estado.color + ' border-current'
                              : 'border-slate-200 text-slate-400 hover:border-slate-300'
                          } ${!canEdit && 'cursor-default'}`}
                          title={estado.value}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {!selectedClase
                ? 'Selecciona una clase para ver/tomar asistencia'
                : 'No hay estudiantes inscritos en esta clase'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      {asistencias.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Presente</span>
          <span className="flex items-center gap-1"><XCircle className="w-4 h-4 text-red-600" /> Ausente</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yellow-600" /> Tarde</span>
          <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-blue-600" /> Justificado</span>
        </div>
      )}

      {/* Modal Dias Laborables */}
      {showDiasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Configurar Dias Laborables</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowDiasModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ingresa la cantidad de dias laborables por mes para calcular el porcentaje de asistencia.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {MESES.map((mes) => (
                  <div key={mes.key} className="space-y-1">
                    <Label htmlFor={mes.key}>{mes.label}</Label>
                    <Input
                      id={mes.key}
                      type="number"
                      min="0"
                      max="31"
                      value={diasLaborables[mes.key as keyof DiasLaborables]}
                      onChange={(e) => handleDiaChange(mes.key, e.target.value)}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">
                  Total dias laborables: <span className="text-primary">{getTotalDiasConfig()}</span>
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setShowDiasModal(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={saveDiasLaborables} disabled={isSavingDias}>
                  {isSavingDias ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Estadisticas con Porcentajes */}
      {showEstadisticas && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Porcentaje de Asistencia</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Total dias laborables configurados: <strong>{totalDiasLaborables}</strong>
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEstadisticas(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {totalDiasLaborables === 0 ? (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No has configurado los dias laborables. Configuralos primero para ver los porcentajes.
                  </p>
                  <Button onClick={() => { setShowEstadisticas(false); openDiasModal(); }}>
                    Configurar Dias Laborables
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Estudiante</th>
                        <th className="text-center p-3 font-medium">P</th>
                        <th className="text-center p-3 font-medium">T</th>
                        <th className="text-center p-3 font-medium">A</th>
                        <th className="text-center p-3 font-medium">J</th>
                        <th className="text-center p-3 font-medium">Total</th>
                        <th className="text-center p-3 font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.map((est, idx) => (
                        <tr key={est.estudianteId} className="border-t hover:bg-slate-50">
                          <td className="p-3 text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-medium">
                            {est.estudiante?.nombre} {est.estudiante?.apellido}
                          </td>
                          <td className="text-center p-3 text-green-600">{est.presentes}</td>
                          <td className="text-center p-3 text-yellow-600">{est.tardes}</td>
                          <td className="text-center p-3 text-red-600">{est.ausentes}</td>
                          <td className="text-center p-3 text-blue-600">{est.justificados}</td>
                          <td className="text-center p-3 font-medium">{est.totalAsistencias}</td>
                          <td className="text-center p-3">
                            <span className={`px-2 py-1 rounded font-bold ${getPorcentajeColor(est.porcentajeAsistencia)}`}>
                              {est.porcentajeAsistencia}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={() => setShowEstadisticas(false)}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
