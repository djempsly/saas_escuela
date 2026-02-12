'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { sabanaApi, clasesApi, calificacionesApi, ciclosApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, BookOpen, Edit3, Eye, Check, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

// CSS para quitar spinners de inputs numéricos
const noSpinnerStyles = `
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

const COMPETENCIAS = [
  { id: 'COMUNICATIVA', nombre: 'Comunicativa', corto: 'COM' },
  { id: 'LOGICO', nombre: 'Pensamiento Lógico, Creativo y Crítico', corto: 'PLC' },
  { id: 'CIENTIFICO', nombre: 'Científica y Tecnológica', corto: 'CYT' },
  { id: 'ETICO', nombre: 'Ética y Ciudadana', corto: 'EYC' },
  { id: 'DESARROLLO', nombre: 'Desarrollo Personal y Espiritual', corto: 'DPE' },
];

const PERIODOS = [
  { key: 'p1', label: 'P1', rpKey: 'rp1' },
  { key: 'p2', label: 'P2', rpKey: 'rp2' },
  { key: 'p3', label: 'P3', rpKey: 'rp3' },
  { key: 'p4', label: 'P4', rpKey: 'rp4' },
];

const NOTA_APROBACION = 70;

interface Clase {
  id: string;
  materiaId: string;
  nivelId: string;
  cicloLectivoId: string;
  materia?: { id: string; nombre: string; codigo: string | null };
  nivel?: { id: string; nombre: string; gradoNumero: number | null };
  cicloLectivo?: { id: string; nombre: string; activo: boolean };
  _count?: { inscripciones: number };
}

interface CompGrades {
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
}

interface StudentCalificacion {
  claseId?: string;
  clase?: { id?: string; materia?: { nombre: string } };
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
  promedioFinal?: number | null;
  promedio?: number | null;
  [key: string]: unknown;
}

interface StudentCompetencia {
  claseId?: string;
  clase?: { id?: string; materia?: { nombre: string } };
  competencia: string;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
  [key: string]: unknown;
}

interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface BoletinCalificacion {
  materia: string;
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  promedioFinal: number | null;
  situacion: string | null;
  [key: string]: unknown;
}

interface BoletinData {
  institucion?: { nombre: string };
  estudiante?: { nombre: string; apellido: string };
  cicloLectivo?: { nombre: string };
  calificaciones?: BoletinCalificacion[];
  promedioGeneral?: number | null;
}

interface StudentRow {
  estudianteId: string;
  nombre: string;
  apellido: string;
  grades: CompGrades;
}

const ROLES_LECTURA = ['ADMIN', 'DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO', 'DOCENTE', 'SECRETARIA'];

export default function CalificacionesPage() {
  const { user } = useAuthStore();
  const [clases, setClases] = useState<Clase[]>([]);
  const [selectedClaseId, setSelectedClaseId] = useState('');
  const [selectedCompetencia, setSelectedCompetencia] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Vista estudiante
  const [studentCalificaciones, setStudentCalificaciones] = useState<StudentCalificacion[]>([]);
  const [studentCompetencias, setStudentCompetencias] = useState<StudentCompetencia[]>([]);
  const [ciclosLectivos, setCiclosLectivos] = useState<CicloLectivo[]>([]);
  const [selectedCicloId, setSelectedCicloId] = useState('');
  const [boletinData, setBoletinData] = useState<BoletinData | null>(null);
  const [isLoadingBoletin, setIsLoadingBoletin] = useState(false);
  const [boletinOpen, setBoletinOpen] = useState(false);

  const userRole = user?.role || '';
  const canRead = ROLES_LECTURA.includes(userRole) || userRole === 'ESTUDIANTE';
  const canEdit = userRole === 'DOCENTE';
  const isEstudiante = userRole === 'ESTUDIANTE';

  const selectedClase = clases.find(c => c.id === selectedClaseId);

  // Cargar datos iniciales
  useEffect(() => {
    const load = async () => {
      try {
        if (isEstudiante) {
          const res = await calificacionesApi.getMisCalificaciones();
          const data = res.data?.data || res.data || {};
          setStudentCalificaciones(data.calificaciones || data || []);
          setStudentCompetencias(data.calificacionesCompetencia || []);
          // Cargar ciclos lectivos para el selector de boletín
          try {
            const ciclosRes = await ciclosApi.getAll();
            const ciclosData = ciclosRes.data?.data || ciclosRes.data || [];
            setCiclosLectivos(Array.isArray(ciclosData) ? ciclosData : []);
            // Seleccionar el ciclo activo por defecto
            const activo = ciclosData.find((c: CicloLectivo) => c.activo);
            if (activo) setSelectedCicloId(activo.id);
          } catch {
            // silently fail
          }
        } else if (canRead) {
          const res = await clasesApi.getAll();
          const data = res.data?.data || res.data || [];
          setClases(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isEstudiante, canRead]);

  // Cargar boletín
  const loadBoletin = useCallback(async () => {
    if (!selectedCicloId || !isEstudiante) return;
    setIsLoadingBoletin(true);
    try {
      const res = await calificacionesApi.getMiBoletin(selectedCicloId);
      setBoletinData(res.data?.data || res.data || null);
    } catch (err) {
      toast.error('Error al cargar boletín');
    } finally {
      setIsLoadingBoletin(false);
    }
  }, [selectedCicloId, isEstudiante]);

  // Cargar calificaciones por competencia
  const loadGrades = useCallback(async () => {
    if (!selectedClaseId || !selectedCompetencia) {
      setStudents([]);
      return;
    }

    const clase = clases.find(c => c.id === selectedClaseId);
    if (!clase) return;

    setIsLoadingGrades(true);
    try {
      const res = await sabanaApi.getSabana(clase.nivelId, clase.cicloLectivoId);
      const sabana = res.data?.data || res.data;
      const materiaId = clase.materiaId;

      const rows: StudentRow[] = [];
      for (const est of sabana.estudiantes || []) {
        const cal = est.calificaciones?.[materiaId];
        if (cal && cal.claseId === selectedClaseId) {
          const compGrades = cal.competencias?.[selectedCompetencia] || {
            p1: null, p2: null, p3: null, p4: null,
            rp1: null, rp2: null, rp3: null, rp4: null,
          };
          rows.push({
            estudianteId: est.id,
            nombre: `${est.nombre}${est.segundoNombre ? ` ${est.segundoNombre}` : ''}`,
            apellido: `${est.apellido}${est.segundoApellido ? ` ${est.segundoApellido}` : ''}`,
            grades: compGrades,
          });
        }
      }
      rows.sort((a, b) => a.apellido.localeCompare(b.apellido));
      setStudents(rows);
    } catch (err) {
      console.error('Error loading grades:', err);
      toast.error('Error al cargar calificaciones');
    } finally {
      setIsLoadingGrades(false);
    }
  }, [selectedClaseId, selectedCompetencia, clases]);

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  // Edición
  const startEditing = (studentId: string, periodo: string, currentValue: number | null) => {
    if (!canEdit) return;
    setEditingCell(`${studentId}-${periodo}`);
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveGrade = async (studentId: string, periodo: string) => {
    const value = editValue === '' ? null : parseFloat(editValue);
    if (value !== null && (isNaN(value) || value < 0 || value > 100)) {
      toast.error('La nota debe ser un número entre 0 y 100');
      return;
    }

    setIsSaving(true);
    try {
      await sabanaApi.updateCalificacion({
        claseId: selectedClaseId,
        estudianteId: studentId,
        periodo,
        valor: value,
        competenciaId: selectedCompetencia,
      });

      setStudents(prev =>
        prev.map(s =>
          s.estudianteId === studentId
            ? { ...s, grades: { ...s.grades, [periodo]: value } }
            : s
        )
      );

      setEditingCell(null);
      setEditValue('');
      toast.success('Calificación guardada');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || (err instanceof Error ? err.message : 'Error al guardar'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, periodo: string) => {
    if (e.key === 'Enter') saveGrade(studentId, periodo);
    else if (e.key === 'Escape') cancelEditing();
  };

  const isRpEnabled = (grades: CompGrades, rpKey: string) => {
    const pKey = rpKey.replace('rp', 'p') as keyof CompGrades;
    const pValue = grades[pKey];
    return pValue !== null && pValue !== undefined && pValue < NOTA_APROBACION;
  };

  const renderCell = (student: StudentRow, periodo: string, isRp: boolean = false) => {
    const cellKey = `${student.estudianteId}-${periodo}`;
    const value = student.grades[periodo as keyof CompGrades];
    const isEditing = editingCell === cellKey;

    if (isRp && !isRpEnabled(student.grades, periodo)) {
      return <span className="text-muted-foreground bg-slate-100 px-2 py-1 rounded text-sm">-</span>;
    }

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, student.estudianteId, periodo)}
            className="w-16 h-8 text-center text-sm"
            autoFocus
            disabled={isSaving}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => saveGrade(student.estudianteId, periodo)}
            disabled={isSaving}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={cancelEditing}
            disabled={isSaving}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      );
    }

    const displayValue = value ?? '-';
    const colorClass =
      value !== null && value !== undefined
        ? value >= 70 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'
        : 'text-muted-foreground';

    if (canEdit) {
      return (
        <button
          onClick={() => startEditing(student.estudianteId, periodo, value)}
          className={`w-full hover:bg-slate-100 rounded px-2 py-1 text-sm ${colorClass}`}
          title="Clic para editar"
        >
          {displayValue}
        </button>
      );
    }

    return <span className={`text-sm ${colorClass}`}>{displayValue}</span>;
  };

  // Sin permisos
  if (!canRead) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes permisos para ver esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Estudiante
  if (isEstudiante) {
    // Agrupar competencias por materia
    const competenciasPorMateria: Record<string, { materia: string; competencias: StudentCompetencia[] }> = {};
    for (const comp of studentCompetencias) {
      const materiaName = comp.clase?.materia?.nombre || 'Sin materia';
      if (!competenciasPorMateria[materiaName]) {
        competenciasPorMateria[materiaName] = { materia: materiaName, competencias: [] };
      }
      competenciasPorMateria[materiaName].competencias.push(comp);
    }

    const getGradeColor = (val: number | null) => {
      if (val == null) return 'text-muted-foreground';
      if (val >= 70) return 'text-green-600';
      if (val >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mis Calificaciones</h1>
            <p className="text-muted-foreground">Consulta tus calificaciones y boletín</p>
          </div>
          <Dialog open={boletinOpen} onOpenChange={setBoletinOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (selectedCicloId && !boletinData) loadBoletin();
                }}
              >
                <FileText className="w-4 h-4" />
                Ver mi Boletín
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Mi Boletín de Calificaciones</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">Ciclo Lectivo:</label>
                  <select
                    value={selectedCicloId}
                    onChange={(e) => {
                      setSelectedCicloId(e.target.value);
                      setBoletinData(null);
                    }}
                    className="px-3 py-1.5 border rounded-md text-sm"
                  >
                    <option value="">-- Seleccionar --</option>
                    {ciclosLectivos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.activo ? '(Activo)' : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={loadBoletin}
                    disabled={!selectedCicloId || isLoadingBoletin}
                  >
                    {isLoadingBoletin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cargar'}
                  </Button>
                </div>

                {isLoadingBoletin ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : boletinData ? (
                  <div className="space-y-4">
                    {boletinData.institucion && (
                      <div className="text-center border-b pb-3">
                        <h3 className="font-bold text-lg">{boletinData.institucion.nombre}</h3>
                        <p className="text-sm text-muted-foreground">
                          {boletinData.estudiante?.nombre} {boletinData.estudiante?.apellido} - {boletinData.cicloLectivo?.nombre}
                        </p>
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Materia</th>
                          {PERIODOS.map(p => (
                            <th key={p.key} className="text-center p-2 font-medium w-14">{p.label}</th>
                          ))}
                          <th className="text-center p-2 font-medium w-16 bg-slate-100">Prom.</th>
                          <th className="text-center p-2 font-medium w-20">Situación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boletinData.calificaciones?.map((cal: BoletinCalificacion, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 font-medium">{cal.materia}</td>
                            {PERIODOS.map(p => {
                              const val = cal[p.key] as number | null;
                              return (
                                <td key={p.key} className={`text-center p-2 ${getGradeColor(val)}`}>
                                  {val ?? '-'}
                                </td>
                              );
                            })}
                            <td className={`text-center p-2 font-bold bg-slate-50 ${getGradeColor(cal.promedioFinal)}`}>
                              {cal.promedioFinal != null ? Number(cal.promedioFinal).toFixed(1) : '-'}
                            </td>
                            <td className="text-center p-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                cal.situacion === 'APROBADO' ? 'bg-green-100 text-green-700' :
                                cal.situacion === 'REPROBADO' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {cal.situacion || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {boletinData.promedioGeneral != null && (
                      <div className="text-right font-bold text-sm">
                        Promedio General: {Number(boletinData.promedioGeneral).toFixed(2)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Selecciona un ciclo lectivo y presiona &quot;Cargar&quot;
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">Vista General</TabsTrigger>
              <TabsTrigger value="competencias">Vista por Competencias</TabsTrigger>
            </TabsList>

            {/* Vista General - tabla existente */}
            <TabsContent value="general">
              {studentCalificaciones.length > 0 ? (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-4 font-medium text-sm">Materia</th>
                          {PERIODOS.map(p => (
                            <Fragment key={p.key}>
                              <th className="text-center p-2 font-medium text-sm w-16">{p.label}</th>
                              <th className="text-center p-2 font-medium text-sm w-16 bg-amber-50">R{p.label}</th>
                            </Fragment>
                          ))}
                          <th className="text-center p-4 font-medium text-sm w-24 bg-slate-100">Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentCalificaciones.map((cal, idx: number) => {
                          const promedio = cal.promedioFinal ?? cal.promedio ?? null;
                          return (
                            <tr key={idx} className="border-t hover:bg-slate-50">
                              <td className="p-4 font-medium text-sm">{cal.clase?.materia?.nombre || 'Sin materia'}</td>
                              {PERIODOS.map(p => {
                                const pVal = cal[p.key] as number | null;
                                const rpVal = cal[p.rpKey] as number | null;
                                const pColor = pVal != null ? (pVal >= 70 ? 'text-green-600' : pVal >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-muted-foreground';
                                const rpColor = rpVal != null ? (rpVal >= 70 ? 'text-green-600' : rpVal >= 60 ? 'text-yellow-600' : 'text-red-600') : 'text-muted-foreground';
                                return (
                                  <Fragment key={p.key}>
                                    <td className={`text-center p-2 text-sm ${pColor}`}>{pVal ?? '-'}</td>
                                    <td className={`text-center p-2 text-sm bg-amber-50 ${rpColor}`}>{rpVal ?? '-'}</td>
                                  </Fragment>
                                );
                              })}
                              <td className="text-center p-4 font-bold text-sm bg-slate-50">
                                {promedio != null ? Number(promedio).toFixed(1) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay calificaciones registradas</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Vista por Competencias */}
            <TabsContent value="competencias">
              {Object.keys(competenciasPorMateria).length > 0 ? (
                <div className="space-y-4">
                  {Object.values(competenciasPorMateria).map((grupo) => (
                    <Card key={grupo.materia}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{grupo.materia}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left p-3 font-medium">Competencia</th>
                              {PERIODOS.map(p => (
                                <Fragment key={p.key}>
                                  <th className="text-center p-2 font-medium w-14">{p.label}</th>
                                  <th className="text-center p-2 font-medium w-14 bg-amber-50">R{p.label}</th>
                                </Fragment>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.competencias.map((comp, idx: number) => {
                              const compInfo = COMPETENCIAS.find(c => c.id === comp.competencia);
                              return (
                                <tr key={idx} className="border-t hover:bg-slate-50">
                                  <td className="p-3 font-medium">
                                    <span className="text-xs text-muted-foreground mr-1">{compInfo?.corto || comp.competencia}</span>
                                    {compInfo?.nombre || comp.competencia}
                                  </td>
                                  {PERIODOS.map(p => {
                                    const pVal = comp[p.key] as number | null;
                                    const rpVal = comp[p.rpKey] as number | null;
                                    return (
                                      <Fragment key={p.key}>
                                        <td className={`text-center p-2 ${getGradeColor(pVal)}`}>{pVal ?? '-'}</td>
                                        <td className={`text-center p-2 bg-amber-50 ${getGradeColor(rpVal)}`}>{rpVal ?? '-'}</td>
                                      </Fragment>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay calificaciones por competencia publicadas</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Leyenda */}
        {studentCalificaciones.length > 0 && (
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

  // Vista principal: Docente / Director / Admin
  return (
    <div className="space-y-6">
      <style>{noSpinnerStyles}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calificaciones por Competencia</h1>
          <p className="text-muted-foreground">
            {canEdit
              ? 'Califica por competencia y los datos se reflejan en la sábana de notas'
              : 'Consulta las calificaciones por competencia'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Modo edición
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" /> Solo lectura
            </span>
          )}
        </div>
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clase</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedClaseId}
              onChange={(e) => {
                setSelectedClaseId(e.target.value);
                setEditingCell(null);
              }}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="">-- Seleccionar clase --</option>
              {clases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.materia?.nombre} - {c.nivel?.nombre}
                  {c._count ? ` (${c._count.inscripciones} est.)` : ''}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Competencia</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedCompetencia}
              onChange={(e) => {
                setSelectedCompetencia(e.target.value);
                setEditingCell(null);
              }}
              className="w-full px-3 py-2 border rounded-md text-sm"
              disabled={!selectedClaseId}
            >
              <option value="">-- Seleccionar competencia --</option>
              {COMPETENCIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.corto} - {c.nombre}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      {selectedClase && selectedCompetencia && !isLoadingGrades && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md text-sm">
          <strong>{selectedClase.materia?.nombre}</strong> · {selectedClase.nivel?.nombre} · Competencia:{' '}
          <strong>{COMPETENCIAS.find(c => c.id === selectedCompetencia)?.nombre}</strong> · {students.length} estudiantes
        </div>
      )}

      {/* Tabla */}
      {isLoading || isLoadingGrades ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : students.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-medium text-sm w-8">#</th>
                  <th className="text-left p-3 font-medium text-sm">Estudiante</th>
                  {PERIODOS.map((p) => (
                    <Fragment key={p.key}>
                      <th className="text-center p-2 font-medium text-sm w-16">{p.label}</th>
                      <th className="text-center p-2 font-medium text-sm w-16 bg-amber-50" title={`Recuperación ${p.label}`}>
                        R{p.label}
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.estudianteId} className="border-t hover:bg-slate-50">
                    <td className="p-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 text-sm font-medium">
                      {student.apellido}, {student.nombre}
                    </td>
                    {PERIODOS.map((p) => (
                      <Fragment key={p.key}>
                        <td className="text-center p-2">{renderCell(student, p.key)}</td>
                        <td className="text-center p-2 bg-amber-50">{renderCell(student, p.rpKey, true)}</td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : selectedClaseId && selectedCompetencia ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay estudiantes inscritos en esta clase</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una clase y una competencia para ver las calificaciones
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      {students.length > 0 && (
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
          {canEdit && (
            <span className="flex items-center gap-1 ml-auto">
              <Edit3 className="w-3 h-3" /> Clic en una celda para editar
            </span>
          )}
        </div>
      )}
    </div>
  );
}
