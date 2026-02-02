'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { asistenciaApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ClipboardCheck, Loader2, CheckCircle, XCircle, Clock, AlertCircle, Save } from 'lucide-react';

const ESTADOS = [
  { value: 'PRESENTE', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', label: 'P' },
  { value: 'AUSENTE', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', label: 'A' },
  { value: 'TARDE', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'T' },
  { value: 'JUSTIFICADO', icon: AlertCircle, color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'J' },
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

export default function AsistenciaPage() {
  const searchParams = useSearchParams();
  const claseIdFromUrl = searchParams.get('clase');

  const { user } = useAuthStore();
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [clases, setClases] = useState<any[]>([]);
  const [claseInfo, setClaseInfo] = useState<{ materia: string; nivel: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClase, setSelectedClase] = useState(claseIdFromUrl || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');

  const isDocente = user?.role === 'DOCENTE';
  const canEdit = isDocente;

  useEffect(() => {
    const fetchClases = async () => {
      try {
        const response = await clasesApi.getAll();
        setClases(response.data.data || response.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClases();
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

  // Estadisticas
  const stats = {
    presentes: asistencias.filter(a => a.estado === 'PRESENTE').length,
    ausentes: asistencias.filter(a => a.estado === 'AUSENTE').length,
    tardes: asistencias.filter(a => a.estado === 'TARDE').length,
    justificados: asistencias.filter(a => a.estado === 'JUSTIFICADO').length,
    sinMarcar: asistencias.filter(a => a.estado === null).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground">
            {canEdit ? 'Registra la asistencia de tu clase' : 'Consulta la asistencia'}
          </p>
        </div>
        {canEdit && selectedClase && asistencias.length > 0 && (
          <Button onClick={guardarAsistencia} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Selector de clase y fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Clase y Fecha</CardTitle>
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
    </div>
  );
}
