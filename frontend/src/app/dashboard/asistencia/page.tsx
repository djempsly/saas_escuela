'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { asistenciaApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ClipboardCheck, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const ESTADOS = {
  PRESENTE: { icon: CheckCircle, color: 'text-green-600', label: 'Presente' },
  AUSENTE: { icon: XCircle, color: 'text-red-600', label: 'Ausente' },
  TARDE: { icon: Clock, color: 'text-yellow-600', label: 'Tarde' },
  JUSTIFICADO: { icon: AlertCircle, color: 'text-blue-600', label: 'Justificado' },
};

export default function AsistenciaPage() {
  const { user } = useAuthStore();
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [clases, setClases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClase, setSelectedClase] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const isDocente = user?.role === 'DOCENTE' || user?.role === 'COORDINADOR_ACADEMICO';

  useEffect(() => {
    const fetch = async () => {
      try {
        if (isDocente) {
          const response = await clasesApi.getAll();
          setClases(response.data.data || response.data || []);
        } else {
          const response = await asistenciaApi.getMiAsistencia();
          setAsistencias(response.data.data || response.data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [isDocente]);

  const loadAsistenciaClase = async (claseId: string) => {
    setSelectedClase(claseId);
    try {
      const response = await asistenciaApi.getByClase(claseId, selectedDate);
      setAsistencias(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isDocente ? 'Tomar Asistencia' : 'Mi Asistencia'}
        </h1>
        <p className="text-muted-foreground">
          {isDocente ? 'Registra la asistencia de tus clases' : 'Consulta tu historial de asistencia'}
        </p>
      </div>

      {isDocente && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seleccionar Clase y Fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
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
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : asistencias.length > 0 ? (
        <div className="grid gap-3">
          {asistencias.map((asist, idx) => {
            const estado = ESTADOS[asist.estado as keyof typeof ESTADOS] || ESTADOS.PRESENTE;
            const Icon = estado.icon;
            return (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${estado.color}`} />
                    <div>
                      <p className="font-medium">
                        {isDocente
                          ? `${asist.estudiante?.nombre} ${asist.estudiante?.apellido}`
                          : asist.clase?.materia?.nombre}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(asist.fecha).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${estado.color}`}>
                    {estado.label}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isDocente && !selectedClase
                ? 'Selecciona una clase para ver/tomar asistencia'
                : 'No hay registros de asistencia'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
