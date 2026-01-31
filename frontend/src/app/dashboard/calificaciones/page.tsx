'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calificacionesApi, clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BookOpen, Loader2, FileText } from 'lucide-react';

export default function CalificacionesPage() {
  const { user } = useAuthStore();
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [clases, setClases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClase, setSelectedClase] = useState('');

  const isDocente = user?.role === 'DOCENTE' || user?.role === 'COORDINADOR_ACADEMICO';

  useEffect(() => {
    const fetch = async () => {
      try {
        if (isDocente) {
          const response = await clasesApi.getAll();
          setClases(response.data.data || response.data || []);
        } else {
          const response = await calificacionesApi.getMisCalificaciones();
          setCalificaciones(response.data.data || response.data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [isDocente]);

  const loadCalificacionesClase = async (claseId: string) => {
    setSelectedClase(claseId);
    try {
      const response = await calificacionesApi.getByClase(claseId);
      setCalificaciones(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calificaciones</h1>
        <p className="text-muted-foreground">
          {isDocente ? 'Gestiona las calificaciones de tus clases' : 'Consulta tus calificaciones'}
        </p>
      </div>

      {isDocente && (
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
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : calificaciones.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-medium">
                    {isDocente ? 'Estudiante' : 'Materia'}
                  </th>
                  <th className="text-center p-4 font-medium">P1</th>
                  <th className="text-center p-4 font-medium">P2</th>
                  <th className="text-center p-4 font-medium">P3</th>
                  <th className="text-center p-4 font-medium">P4</th>
                  <th className="text-center p-4 font-medium">Prom.</th>
                </tr>
              </thead>
              <tbody>
                {calificaciones.map((cal, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-4">
                      {isDocente
                        ? `${cal.estudiante?.nombre} ${cal.estudiante?.apellido}`
                        : cal.clase?.materia?.nombre}
                    </td>
                    <td className="text-center p-4">{cal.p1 ?? '-'}</td>
                    <td className="text-center p-4">{cal.p2 ?? '-'}</td>
                    <td className="text-center p-4">{cal.p3 ?? '-'}</td>
                    <td className="text-center p-4">{cal.p4 ?? '-'}</td>
                    <td className="text-center p-4 font-medium">
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
              {isDocente && !selectedClase
                ? 'Selecciona una clase para ver las calificaciones'
                : 'No hay calificaciones registradas'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
