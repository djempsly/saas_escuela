'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Eye, EyeOff } from 'lucide-react';
import type { Nivel, CicloLectivo, SabanaData, Materia } from '../types';

interface SabanaToolbarProps {
  niveles: Nivel[];
  ciclosLectivos: CicloLectivo[];
  selectedNivel: string;
  setSelectedNivel: (val: string) => void;
  selectedCiclo: string;
  setSelectedCiclo: (val: string) => void;
  selectedMateriaId: string;
  setSelectedMateriaId: (val: string) => void;
  isDocente: boolean;
  materiasDocente: Materia[];
  sabanaData: SabanaData | null;
  user: { id?: string; role?: string } | null;
  isPublishing: boolean;
  handlePublicar: (claseId: string) => void;
}

export function SabanaToolbar({
  niveles, ciclosLectivos, selectedNivel, setSelectedNivel,
  selectedCiclo, setSelectedCiclo, selectedMateriaId, setSelectedMateriaId,
  isDocente, materiasDocente, sabanaData, user, isPublishing, handlePublicar,
}: SabanaToolbarProps) {
  return (
    <>
      <Card><CardContent className="pt-4">
        <div className={`grid grid-cols-1 ${isDocente && materiasDocente.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          <div>
            <label className="text-sm font-medium mb-1 block">Nivel / Grado</label>
            <Select value={selectedNivel} onValueChange={(val) => { setSelectedNivel(val); setSelectedMateriaId('all'); }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
              <SelectContent>{niveles.map((nivel) => (<SelectItem key={nivel.id} value={nivel.id}>{nivel.nombre}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Año Escolar</label>
            <Select value={selectedCiclo} onValueChange={setSelectedCiclo}>
              <SelectTrigger><SelectValue placeholder="Seleccionar ciclo" /></SelectTrigger>
              <SelectContent>{ciclosLectivos.map((ciclo) => (<SelectItem key={ciclo.id} value={ciclo.id}>{ciclo.nombre} {ciclo.activo && '(Activo)'}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          {isDocente && materiasDocente.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Asignatura (Sus Materias)</label>
              <Select value={selectedMateriaId} onValueChange={setSelectedMateriaId}>
                <SelectTrigger><SelectValue placeholder="Todas sus materias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas sus materias</SelectItem>
                  {materiasDocente.map((materia) => (
                    <SelectItem key={materia.id} value={materia.id}>{materia.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent></Card>

      {sabanaData && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-3">Estado de publicacion por materia</h3>
            <div className="space-y-2">
              {sabanaData.materias
                .filter(m => {
                  if (isDocente) {
                    return sabanaData.estudiantes.some(est => {
                      const cal = est.calificaciones[m.id];
                      return cal && cal.docenteId === user?.id;
                    });
                  }
                  return true;
                })
                .map(materia => {
                  const firstEstWithCal = sabanaData.estudiantes.find(est => est.calificaciones[materia.id]?.claseId);
                  const claseId = firstEstWithCal?.calificaciones[materia.id]?.claseId;
                  const calificaciones = sabanaData.estudiantes
                    .map(est => est.calificaciones[materia.id])
                    .filter(Boolean);
                  const totalCals = calificaciones.length;
                  const publicadas = calificaciones.filter(c => c?.publicado).length;
                  const todasPublicadas = totalCals > 0 && publicadas === totalCals;
                  const algunaPublicada = publicadas > 0;
                  const canPublish = claseId && (
                    user?.role === 'DIRECTOR' || user?.role === 'COORDINADOR' ||
                    user?.role === 'COORDINADOR_ACADEMICO' ||
                    (isDocente && calificaciones.some(c => c?.docenteId === user?.id))
                  );

                  return (
                    <div key={materia.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {todasPublicadas ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
                        <span className="text-sm font-medium">{materia.nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          todasPublicadas ? 'bg-green-100 text-green-700'
                            : algunaPublicada ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {todasPublicadas ? 'Publicado' : algunaPublicada ? `${publicadas}/${totalCals} publicadas` : 'Borrador'}
                        </span>
                      </div>
                      {canPublish && !todasPublicadas && (
                        <Button size="sm" variant="outline" onClick={() => handlePublicar(claseId!)} disabled={isPublishing} className="text-xs">
                          {isPublishing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                          Publicar
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
