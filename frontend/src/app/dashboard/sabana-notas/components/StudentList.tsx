'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, User, ChevronRight } from 'lucide-react';
import type { Estudiante } from '../types';

interface StudentListProps {
  estudiantes: Estudiante[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectStudent: (index: number) => void;
}

export function StudentList({ estudiantes, searchTerm, setSearchTerm, onSelectStudent }: StudentListProps) {
  const filteredEstudiantes = estudiantes.filter((est) => {
    const nombreCompleto = `${est.nombre} ${est.segundoNombre || ''} ${est.apellido} ${est.segundoApellido || ''}`.toLowerCase();
    return nombreCompleto.includes(searchTerm.toLowerCase());
  });

  return (
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

        {filteredEstudiantes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No se encontraron estudiantes</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEstudiantes.map((estudiante) => {
              const originalIndex = estudiantes.findIndex(e => e.id === estudiante.id);
              return (
                <button
                  key={estudiante.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                  onClick={() => onSelectStudent(originalIndex)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {estudiante.nombre[0]}{estudiante.apellido[0]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {estudiante.apellido.toUpperCase()} {estudiante.segundoApellido ? estudiante.segundoApellido.toUpperCase() : ''}, {estudiante.nombre} {estudiante.segundoNombre || ''}
                    </p>
                    <p className="text-sm text-muted-foreground">Click para ver boletín</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          Mostrando {filteredEstudiantes.length} de {estudiantes.length} estudiantes
        </div>
      </CardContent>
    </Card>
  );
}
