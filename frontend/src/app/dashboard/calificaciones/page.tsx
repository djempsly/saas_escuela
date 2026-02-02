'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calificacionesApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BookOpen, Loader2, Eye, Edit3, Check, X } from 'lucide-react';

interface Calificacion {
  id?: string;
  estudianteId: string;
  claseId: string;
  estudiante?: {
    id: string;
    nombre: string;
    apellido: string;
  };
  clase?: {
    materia?: { nombre: string };
  };
  p1?: number | null;
  p2?: number | null;
  p3?: number | null;
  p4?: number | null;
  rp1?: number | null;
  rp2?: number | null;
  rp3?: number | null;
  rp4?: number | null;
  promedio?: number | null;
}

interface Clase {
  id: string;
  materia?: { nombre: string };
  nivel?: { nombre: string };
  docente?: { nombre: string; apellido: string };
}

// Roles que pueden ver calificaciones
const ROLES_LECTURA = ['ADMIN', 'DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO', 'DOCENTE'];
// Solo docente puede editar
const ROLES_ESCRITURA = ['DOCENTE'];

export default function CalificacionesPage() {
  const { user } = useAuthStore();
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedClase, setSelectedClase] = useState('');
  const [editingCell, setEditingCell] = useState<{ idx: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const userRole = user?.role || '';
  const canRead = ROLES_LECTURA.includes(userRole);
  const canEdit = ROLES_ESCRITURA.includes(userRole);
  const isEstudiante = userRole === 'ESTUDIANTE';

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isEstudiante) {
          // Estudiante ve sus propias calificaciones
          const response = await calificacionesApi.getMisCalificaciones();
          setCalificaciones(response.data.data || response.data || []);
        } else if (canRead) {
          // Otros roles ven lista de clases para seleccionar
          const response = await clasesApi.getAll();
          setClases(response.data.data || response.data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isEstudiante, canRead]);

  const loadCalificacionesClase = async (claseId: string) => {
    if (!claseId) {
      setCalificaciones([]);
      setSelectedClase('');
      return;
    }
    setSelectedClase(claseId);
    setIsLoading(true);
    try {
      const response = await calificacionesApi.getByClase(claseId);
      setCalificaciones(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (idx: number, field: string, currentValue: number | null | undefined) => {
    if (!canEdit) return;
    setEditingCell({ idx, field });
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveCalificacion = async (idx: number, field: string) => {
    const cal = calificaciones[idx];
    const value = editValue === '' ? null : parseFloat(editValue);

    if (value !== null && (isNaN(value) || value < 0 || value > 100)) {
      alert('La nota debe ser un numero entre 0 y 100');
      return;
    }

    setIsSaving(true);
    try {
      await calificacionesApi.guardar({
        estudianteId: cal.estudianteId,
        claseId: cal.claseId,
        [field]: value,
      });

      // Actualizar estado local
      const updated = [...calificaciones];
      updated[idx] = { ...updated[idx], [field]: value };

      // Recalcular promedio
      const notas = [updated[idx].p1, updated[idx].p2, updated[idx].p3, updated[idx].p4]
        .filter((n): n is number => n !== null && n !== undefined);
      updated[idx].promedio = notas.length > 0
        ? notas.reduce((a, b) => a + b, 0) / notas.length
        : null;

      setCalificaciones(updated);
      setEditingCell(null);
      setEditValue('');
      setSuccessMessage('Calificacion guardada');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number, field: string) => {
    if (e.key === 'Enter') {
      saveCalificacion(idx, field);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const renderCell = (_cal: Calificacion, idx: number, field: string, value: number | null | undefined) => {
    const isEditing = editingCell?.idx === idx && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, idx, field)}
            className="w-16 h-8 text-center text-sm"
            autoFocus
            disabled={isSaving}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => saveCalificacion(idx, field)}
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
    const colorClass = value !== null && value !== undefined
      ? value >= 70 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600'
      : 'text-muted-foreground';

    if (canEdit) {
      return (
        <button
          onClick={() => startEditing(idx, field, value)}
          className={`w-full h-full hover:bg-slate-100 rounded px-2 py-1 ${colorClass}`}
          title="Clic para editar"
        >
          {displayValue}
        </button>
      );
    }

    return <span className={colorClass}>{displayValue}</span>;
  };

  // No tiene permisos
  if (!canRead && !isEstudiante) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes permisos para ver esta seccion</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calificaciones</h1>
          <p className="text-muted-foreground">
            {isEstudiante
              ? 'Consulta tus calificaciones'
              : canEdit
                ? 'Gestiona las calificaciones de tus clases'
                : 'Consulta las calificaciones'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Modo edicion
            </span>
          ) : (
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
              <Eye className="w-3 h-3" /> Solo lectura
            </span>
          )}
        </div>
      </div>

      {/* Mensaje de exito */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm">
          {successMessage}
        </div>
      )}

      {/* Selector de clase (no para estudiantes) */}
      {!isEstudiante && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleccionar Clase</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedClase}
              onChange={(e) => loadCalificacionesClase(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">-- Seleccionar clase --</option>
              {clases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.materia?.nombre} - {c.nivel?.nombre}
                  {c.docente && ` (${c.docente.nombre} ${c.docente.apellido})`}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Tabla de calificaciones */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : calificaciones.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-medium sticky left-0 bg-slate-50">
                    {isEstudiante ? 'Materia' : 'Estudiante'}
                  </th>
                  <th className="text-center p-4 font-medium w-20">P1</th>
                  <th className="text-center p-4 font-medium w-20">P2</th>
                  <th className="text-center p-4 font-medium w-20">P3</th>
                  <th className="text-center p-4 font-medium w-20">P4</th>
                  <th className="text-center p-4 font-medium w-24 bg-slate-100">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {calificaciones.map((cal, idx) => (
                  <tr key={cal.estudianteId + '-' + idx} className="border-t hover:bg-slate-50">
                    <td className="p-4 font-medium sticky left-0 bg-white">
                      {isEstudiante
                        ? cal.clase?.materia?.nombre || 'Sin materia'
                        : `${cal.estudiante?.nombre || ''} ${cal.estudiante?.apellido || ''}`}
                    </td>
                    <td className="text-center p-2">{renderCell(cal, idx, 'p1', cal.p1)}</td>
                    <td className="text-center p-2">{renderCell(cal, idx, 'p2', cal.p2)}</td>
                    <td className="text-center p-2">{renderCell(cal, idx, 'p3', cal.p3)}</td>
                    <td className="text-center p-2">{renderCell(cal, idx, 'p4', cal.p4)}</td>
                    <td className="text-center p-4 font-bold bg-slate-50">
                      {cal.promedio?.toFixed(1) ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {!isEstudiante && !selectedClase
                ? 'Selecciona una clase para ver las calificaciones'
                : 'No hay calificaciones registradas'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      {calificaciones.length > 0 && (
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
