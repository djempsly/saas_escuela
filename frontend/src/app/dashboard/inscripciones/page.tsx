'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inscripcionesApi, clasesApi, estudiantesApi } from '@/lib/api';
import { Users, Loader2, Plus, Search, UserPlus } from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function InscripcionesPage() {
  const [clases, setClases] = useState<any[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [selectedClase, setSelectedClase] = useState('');
  const [inscritos, setInscritos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [clasesRes, estudiantesRes] = await Promise.all([
          clasesApi.getAll(),
          estudiantesApi.getAll(),
        ]);
        setClases(clasesRes.data.data || clasesRes.data || []);
        setEstudiantes(estudiantesRes.data.data || estudiantesRes.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const loadInscritos = async (claseId: string) => {
    setSelectedClase(claseId);
    try {
      const response = await inscripcionesApi.getByClase(claseId);
      setInscritos(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleInscribir = async (estudianteId: string) => {
    if (!selectedClase) {
      alert('Selecciona una clase primero');
      return;
    }
    try {
      await inscripcionesApi.inscribirMasivo(selectedClase, [estudianteId]);
      loadInscritos(selectedClase);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al inscribir');
    }
  };

  const estudiantesNoInscritos = estudiantes.filter(
    (e) => !inscritos.some((i) => i.estudianteId === e.id || i.estudiante?.id === e.id)
  );

  const filteredEstudiantes = estudiantesNoInscritos.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inscripciones</h1>
        <p className="text-muted-foreground">Gestiona las inscripciones de estudiantes a clases</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Clase</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedClase}
            onChange={(e) => loadInscritos(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">-- Seleccionar clase --</option>
            {clases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.materia?.nombre} - {c.nivel?.nombre} ({c.codigo})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : selectedClase ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Estudiantes Inscritos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" />
                Inscritos ({inscritos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inscritos.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {inscritos.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                        {i.estudiante?.nombre?.[0]}{i.estudiante?.apellido?.[0]}
                      </div>
                      <span className="text-sm">
                        {i.estudiante?.nombre} {i.estudiante?.apellido}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No hay estudiantes inscritos
                </p>
              )}
            </CardContent>
          </Card>

          {/* Estudiantes Disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Disponibles para Inscribir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar estudiante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filteredEstudiantes.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-auto">
                  {filteredEstudiantes.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">
                          {e.nombre[0]}{e.apellido[0]}
                        </div>
                        <span className="text-sm">{e.nombre} {e.apellido}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleInscribir(e.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? 'Sin resultados' : 'Todos los estudiantes están inscritos'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una clase para gestionar inscripciones
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
