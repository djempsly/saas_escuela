'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';

// Tipos de sistemas educativos disponibles por país
const SISTEMAS_EDUCATIVOS_INFO: Record<string, { value: string; label: string; descripcion: string }[]> = {
  DO: [
    { value: 'INICIAL_DO', label: 'Nivel Inicial', descripcion: 'Preescolar / Kinder' },
    { value: 'PRIMARIA_DO', label: 'Primaria', descripcion: '1ro a 6to grado' },
    { value: 'SECUNDARIA_GENERAL_DO', label: 'Secundaria', descripcion: '1ro a 4to de secundaria' },
    { value: 'POLITECNICO_DO', label: 'Politécnico', descripcion: 'Educación técnica profesional' },
  ],
  HT: [
    { value: 'INICIAL_HT', label: 'Niveau Initial', descripcion: 'Préscolaire' },
    { value: 'PRIMARIA_HT', label: 'Primaire', descripcion: '1ère à 6ème année' },
    { value: 'SECUNDARIA_HT', label: 'Secondaire', descripcion: '7ème à 13ème année' },
  ],
};

interface NivelesSelectorProps {
  pais: 'DO' | 'HT';
  selectedSistemas: string[];
  onChange: (sistemas: string[]) => void;
  primaryColor?: string;
  disabled?: boolean;
}

export function NivelesSelector({
  pais,
  selectedSistemas,
  onChange,
  primaryColor = '#1a56db',
  disabled = false,
}: NivelesSelectorProps) {
  const sistemasDisponibles = SISTEMAS_EDUCATIVOS_INFO[pais] || SISTEMAS_EDUCATIVOS_INFO['DO'];

  const toggleSistema = (value: string) => {
    if (disabled) return;

    if (selectedSistemas.includes(value)) {
      // No permitir deseleccionar si es el último
      if (selectedSistemas.length === 1) {
        return;
      }
      onChange(selectedSistemas.filter((s) => s !== value));
    } else {
      onChange([...selectedSistemas, value]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(sistemasDisponibles.map((s) => s.value));
  };

  const clearAll = () => {
    if (disabled) return;
    // Mantener al menos el primero seleccionado
    if (sistemasDisponibles.length > 0) {
      onChange([sistemasDisponibles[0].value]);
    }
  };

  const isSelected = (value: string) => selectedSistemas.includes(value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          Niveles educativos que ofrece <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAll}
            disabled={disabled || selectedSistemas.length === sistemasDisponibles.length}
            className="text-xs h-7 px-2"
          >
            Seleccionar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={disabled || selectedSistemas.length <= 1}
            className="text-xs h-7 px-2"
          >
            Limpiar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sistemasDisponibles.map((sistema) => {
          const selected = isSelected(sistema.value);
          return (
            <button
              key={sistema.value}
              type="button"
              onClick={() => toggleSistema(sistema.value)}
              disabled={disabled}
              className={`
                relative flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
              style={selected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
            >
              {/* Indicador de selección */}
              <div
                className={`
                  absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                  transition-all
                  ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}
                `}
                style={selected ? { backgroundColor: primaryColor } : {}}
              >
                {selected ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-3 h-3" />
                )}
              </div>

              {/* Contenido */}
              <span
                className={`font-medium text-sm pr-6 ${selected ? 'text-primary' : 'text-slate-700'}`}
                style={selected ? { color: primaryColor } : {}}
              >
                {sistema.label}
              </span>
              <span className="text-xs text-slate-500 mt-1">
                {sistema.descripcion}
              </span>
            </button>
          );
        })}
      </div>

      {/* Indicador de selección actual */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedSistemas.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selectedSistemas.length === 1
              ? '1 nivel seleccionado'
              : `${selectedSistemas.length} niveles seleccionados`}
          </p>
        )}
      </div>

      {/* Validación visual */}
      {selectedSistemas.length === 0 && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          Debe seleccionar al menos un nivel educativo
        </p>
      )}
    </div>
  );
}
