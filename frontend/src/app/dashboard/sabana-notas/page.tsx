"use client";

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSabanaData } from './hooks/useSabanaData';
import { useSabanaPublish } from './hooks/useSabanaPublish';
import { SabanaToolbar } from './components/SabanaToolbar';
import { StudentList } from './components/StudentList';
import { BoletinIndividual } from './components/BoletinIndividual';
import type { ViewMode } from './types';

// Re-export types and components used by clases/[id]/page.tsx
export type { SabanaData, Estudiante, Calificacion } from './types';
export { BoletinIndividual } from './components/BoletinIndividual';

export default function SabanaNotasPage() {
  const {
    user, niveles, ciclosLectivos, sabanaData, institucion,
    selectedNivel, setSelectedNivel,
    selectedCiclo, setSelectedCiclo,
    selectedMateriaId, setSelectedMateriaId,
    loading, loadingData,
    isDocente, isReadOnly, materiasDocente, canEditMateria,
    loadSabana, handleSaveCalificacion,
  } = useSabanaData();

  const { isPublishing, handlePublicar } = useSabanaPublish(selectedCiclo, loadSabana);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectStudent = (index: number) => {
    setCurrentStudentIndex(index);
    setViewMode('boletin');
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (viewMode === 'boletin' && sabanaData && sabanaData.estudiantes[currentStudentIndex]) {
    return (
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
        isReadOnly={isReadOnly}
        selectedMateriaId={selectedMateriaId}
        institucion={institucion}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Boletín de Calificaciones</h1>

      <SabanaToolbar
        niveles={niveles}
        ciclosLectivos={ciclosLectivos}
        selectedNivel={selectedNivel}
        setSelectedNivel={setSelectedNivel}
        selectedCiclo={selectedCiclo}
        setSelectedCiclo={setSelectedCiclo}
        selectedMateriaId={selectedMateriaId}
        setSelectedMateriaId={setSelectedMateriaId}
        isDocente={isDocente}
        materiasDocente={materiasDocente}
        sabanaData={!loading ? sabanaData : null}
        user={user}
        isPublishing={isPublishing}
        handlePublicar={handlePublicar}
      />

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      ) : sabanaData && (
        <StudentList
          estudiantes={sabanaData.estudiantes}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSelectStudent={handleSelectStudent}
        />
      )}
    </div>
  );
}
