"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { sabanaApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, FileSpreadsheet, Search, Printer, ChevronLeft, ChevronRight, ArrowLeft, User, Send, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ==================== TIPOS ====================

export interface Materia {
  id: string;
  nombre: string;
  codigo: string | null;
  esOficial: boolean;
  orden: number;
  tipo: string;
}

export interface Calificacion {
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
  promedio: number | null;
  cpc30: number | null;
  cpcNota: number | null;
  cpcTotal: number | null;
  cc: number | null;
  cpex30: number | null;
  cpexNota: number | null;
  cpex70: number | null;
  cex: number | null;
  promedioFinal: number | null;
  situacion: string | null;
  
  // NUEVO: Soporte para múltiples competencias independientes
  competencias?: {
    [competenciaId: string]: {
      p1: number | null;
      p2: number | null;
      p3: number | null;
      p4: number | null;
      rp1: number | null;
      rp2: number | null;
      rp3: number | null;
      rp4: number | null;
    }
  };

  // Notas Técnicas (RA)
  ras?: { [key: string]: number };
  
  claseId: string | null;
  docenteId: string | null;
  docenteNombre: string | null;
  publicado?: boolean;
}

export interface Estudiante {
  id: string;
  nombre: string;
  segundoNombre: string | null;
  apellido: string;
  segundoApellido: string | null;
  fotoUrl: string | null;
  calificaciones: {
    [materiaId: string]: Calificacion;
  };
}

export interface SabanaData {
  nivel: {
    id: string;
    nombre: string;
    gradoNumero: number | null;
  };
  cicloLectivo: {
    id: string;
    nombre: string;
  };
  sistemaEducativo: string;
  numeroPeriodos: number;
  materias: Materia[];
  estudiantes: Estudiante[];
  metadatos: {
    totalEstudiantes: number;
    totalMaterias: number;
    fechaGeneracion: string;
    pais: string;
  };
}

interface Nivel {
  id: string;
  nombre: string;
  gradoNumero: number | null;
  cicloEducativo?: {
    id: string;
    nombre: string;
  };
}

interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

type ViewMode = 'list' | 'boletin';

// ==================== SISTEMAS EDUCATIVOS Y RAs ====================

const SISTEMAS_CON_MODULOS_TECNICOS = ['POLITECNICO_DO'];
const SISTEMAS_PRIMARIA = ['PRIMARIA_DO', 'PRIMARIA_HT'];
const SISTEMAS_INICIAL = ['INICIAL_DO', 'INICIAL_HT'];
const SISTEMAS_SECUNDARIA = ['SECUNDARIA_GENERAL_DO', 'SECUNDARIA_HT', 'POLITECNICO_DO'];

// Lista de RAs para mostrar en la tabla
const RAS_DISPLAY = ['RA1', 'RA2', 'RA3', 'RA4', 'RA5', 'RA6', 'RA7'];

// Determinar el tipo de formato de sábana según el sistema educativo
const getFormatoSabana = (sistemaEducativo: string): 'politecnico' | 'secundaria' | 'primaria' | 'inicial' => {
  if (SISTEMAS_CON_MODULOS_TECNICOS.includes(sistemaEducativo)) return 'politecnico';
  if (SISTEMAS_SECUNDARIA.includes(sistemaEducativo)) return 'secundaria';
  if (SISTEMAS_PRIMARIA.includes(sistemaEducativo)) return 'primaria';
  if (SISTEMAS_INICIAL.includes(sistemaEducativo)) return 'inicial';
  return 'secundaria'; // Por defecto
};

// ==================== COMPETENCIAS MINERD OFICIALES ====================

const COMPETENCIAS = [
  { id: 'COMUNICATIVA', nombre: 'Comunicativa', corto: 'COM' },
  { id: 'LOGICO', nombre: 'Pensamiento Lógico, Creativo y Crítico', corto: 'PLC' },
  { id: 'CIENTIFICO', nombre: 'Científica y Tecnológica', corto: 'CYT' },
  { id: 'ETICO', nombre: 'Ética y Ciudadana', corto: 'EYC' },
  { id: 'DESARROLLO', nombre: 'Desarrollo Personal y Espiritual', corto: 'DPE' },
];

// Periodos
const PERIODOS = ['P1', 'RP1', 'P2', 'RP2', 'P3', 'RP3', 'P4', 'RP4'];

// ==================== ASIGNATURAS OFICIALES MINERD ====================

const ASIGNATURAS_GENERALES_MINERD = [
  { codigo: 'LE', nombre: 'Lengua Española' },
  { codigo: 'LE-IN', nombre: 'Lengua Extranjera (Inglés)' },
  { codigo: 'MAT', nombre: 'Matemática' },
  { codigo: 'CS', nombre: 'Ciencias Sociales' },
  { codigo: 'CN', nombre: 'Ciencias de la Naturaleza' },
  { codigo: 'EA', nombre: 'Educación Artística' },
  { codigo: 'EF', nombre: 'Educación Física' },
  { codigo: 'FIHR', nombre: 'Formación Integral Humana y Religiosa' },
];


// ==================== COMPONENTE LISTA DE ESTUDIANTES ====================

function StudentList({
  estudiantes,
  searchTerm,
  setSearchTerm,
  onSelectStudent,
}: {
  estudiantes: Estudiante[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSelectStudent: (index: number) => void;
}) {
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
                    <p className="text-sm text-muted-foreground">
                      Click para ver boletín
                    </p>
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

// ==================== COMPONENTE BOLETÍN INDIVIDUAL ====================

// Helper para generar lista de celdas editables para navegación
interface EditableCell {
  cellId: string;
  claseId: string | null;
  periodo: string;
  asignaturaIndex: number;
  competenciaIndex: number; // 0 para RA
  periodoIndex: number;
}

export function BoletinIndividual({
  estudiante,
  materias,
  sabanaData,
  currentIndex,
  totalEstudiantes,
  onPrevious,
  onNext,
  onBack,
  onStudentChange,
  estudiantes,
  canEditMateria,
  onSaveCalificacion,
  isReadOnly,
  selectedMateriaId,
}: {
  estudiante: Estudiante;
  materias: Materia[];
  sabanaData: SabanaData;
  currentIndex: number;
  totalEstudiantes: number;
  onPrevious: () => void;
  onNext: () => void;
  onBack: () => void;
  onStudentChange: (index: number) => void;
  estudiantes: Estudiante[];
  canEditMateria: (materiaId: string, cal: Calificacion | undefined) => boolean;
  onSaveCalificacion: (claseId: string, estudianteId: string, periodo: string, valor: number | null, competenciaId?: string) => Promise<void>;
  isReadOnly: boolean;
  selectedMateriaId?: string;
}) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Colores dinámicos según el grado
  const nivelNombre = sabanaData.nivel?.nombre || '';
  const colorPrimario = nivelNombre.includes('6to') ? '#8B0000' :
                        nivelNombre.includes('5to') ? '#166534' : '#1e3a8a';
  const colorClaro = nivelNombre.includes('6to') ? '#fef2f2' :
                     nivelNombre.includes('5to') ? '#f0fdf4' : '#eff6ff';

  // Calcular promedio por periodo para una materia (PROMEDIO DE COMPETENCIAS)
  const calcularPromedioPeriodo = (cal: Calificacion | undefined, periodo: string, rp: string) => {
    if (!cal) return 0;

    // Si existen competencias, el promedio del periodo es el promedio de las notas de cada competencia
    if (cal.competencias && Object.keys(cal.competencias).length > 0) {
      let suma = 0;
      let count = 0;
      
      Object.values(cal.competencias).forEach(comp => {
        const pVal = comp[periodo as keyof typeof comp] as number || 0;
        const rpVal = comp[rp as keyof typeof comp] as number || 0;
        const notaMaxComp = Math.max(pVal, rpVal);
        
        if (notaMaxComp > 0) {
          suma += notaMaxComp;
          count++;
        }
      });
      
      // Retornar promedio redondeado (estándar MINERD)
      return count > 0 ? Math.round(suma / count) : 0;
    }

    // Fallback: Si no hay competencias (sistema simple o legacy), usar nivel superior
    const nota = Math.max((cal as any)[periodo] || 0, (cal as any)[rp] || 0);
    return nota;
  };

  // Calcular C.F. (Calificación Final)
  // SOLO se calcula cuando TODOS los periodos tienen valor
  // Para RD: 4 periodos (P1, P2, P3, P4)
  // Para Haití: 3 periodos (P1, P2, P3)
  const calcularCF = (cal: Calificacion | undefined, isHaiti: boolean = false) => {
    if (!cal) return 0;

    const p1 = calcularPromedioPeriodo(cal, 'p1', 'rp1');
    const p2 = calcularPromedioPeriodo(cal, 'p2', 'rp2');
    const p3 = calcularPromedioPeriodo(cal, 'p3', 'rp3');
    const p4 = calcularPromedioPeriodo(cal, 'p4', 'rp4');

    if (isHaiti) {
      // Haití: 3 trimestres - TODOS deben tener valor
      if (p1 === 0 || p2 === 0 || p3 === 0) return 0;
      return Math.round((p1 + p2 + p3) / 3);
    } else {
      // RD: 4 periodos - TODOS deben tener valor
      if (p1 === 0 || p2 === 0 || p3 === 0 || p4 === 0) return 0;
      return Math.round((p1 + p2 + p3 + p4) / 4);
    }
  };

  // Calcular situación
  const calcularSituacion = (cf: number) => {
    if (cf === 0) return '';
    return cf >= 70 ? 'A' : 'R';
  };

  // Usar asignaturas estáticas del MINERD
  // Buscar la materia del backend que coincida con la asignatura MINERD (por código o nombre)
  const findMateriaByAsignatura = useCallback((asignatura: { codigo: string; nombre: string }) => {
    return materias.find(m =>
      m.codigo === asignatura.codigo ||
      m.nombre.toLowerCase().includes(asignatura.nombre.toLowerCase().split(' ')[0]) ||
      asignatura.nombre.toLowerCase().includes(m.nombre.toLowerCase().split(' ')[0])
    );
  }, [materias]);

  // Módulos técnicos del backend (estos sí vienen dinámicos según la especialidad)
  const modulosTecnicos = useMemo(() => materias.filter(m => m.tipo === 'TECNICA'), [materias]);

  // Generar lista de celdas editables para navegación con Tab
  const editableCells = useMemo(() => {
    const cells: EditableCell[] = [];

    // Asignaturas generales
    ASIGNATURAS_GENERALES_MINERD.forEach((asignatura, asigIdx) => {
      const materia = findMateriaByAsignatura(asignatura);
      const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
      const canEdit = materia ? canEditMateria(materia.id, cal) : false;

      if (canEdit && !isReadOnly) {
        COMPETENCIAS.forEach((comp, compIdx) => {
          PERIODOS.forEach((p, perIdx) => {
            const cellId = `${asignatura.codigo}-${comp.id}-${p}`;
            cells.push({
              cellId,
              claseId: cal?.claseId || null,
              periodo: p.toLowerCase(),
              asignaturaIndex: asigIdx,
              competenciaIndex: compIdx,
              periodoIndex: perIdx,
            });
          });
        });
      }
    });

    // ... (módulos técnicos igual)
    modulosTecnicos.forEach((modulo, modIdx) => {
      const cal = estudiante.calificaciones[modulo.id];
      const canEdit = canEditMateria(modulo.id, cal);

      if (canEdit && !isReadOnly) {
        RAS_DISPLAY.forEach((ra, raIdx) => {
          const cellId = `modulo-${modulo.id}-${ra}`;
          cells.push({
            cellId,
            claseId: cal?.claseId || null,
            periodo: ra,
            asignaturaIndex: ASIGNATURAS_GENERALES_MINERD.length + modIdx,
            competenciaIndex: 0,
            periodoIndex: raIdx,
          });
        });
      }
    });

    return cells;
  }, [findMateriaByAsignatura, estudiante.calificaciones, canEditMateria, isReadOnly, modulosTecnicos]);

  // Encontrar siguiente celda editable
  const findNextCell = useCallback((currentCellId: string, reverse: boolean = false) => {
    const currentIdx = editableCells.findIndex(c => c.cellId === currentCellId);
    if (currentIdx === -1) return null;

    const nextIdx = reverse
      ? (currentIdx > 0 ? currentIdx - 1 : editableCells.length - 1)
      : (currentIdx < editableCells.length - 1 ? currentIdx + 1 : 0);

    return editableCells[nextIdx];
  }, [editableCells]);

  // Manejar edición de celda
  const handleCellClick = (cellId: string, currentValue: number | null, canEdit: boolean) => {
    if (!canEdit || isReadOnly || isSaving) return;
    setEditingCell(cellId);
    setTempValue(currentValue !== null && currentValue !== 0 ? currentValue.toString() : '');
  };

  // Obtener el valor actual de una celda por su ID (Mejorado para competencias)
  const getCellValue = useCallback((nextCell: EditableCell) => {
    if (nextCell.cellId.startsWith('modulo-')) {
      const moduloIdx = nextCell.asignaturaIndex - ASIGNATURAS_GENERALES_MINERD.length;
      const modulo = modulosTecnicos[moduloIdx];
      if (modulo) {
        const cal = estudiante.calificaciones[modulo.id];
        const value = cal?.ras?.[nextCell.periodo];
        return typeof value === 'number' && value !== 0 ? value : null;
      }
    } else {
      // Asignatura general con COMPETENCIA
      const asignatura = ASIGNATURAS_GENERALES_MINERD[nextCell.asignaturaIndex];
      const competencia = COMPETENCIAS[nextCell.competenciaIndex];
      
      if (asignatura && competencia) {
        const materia = findMateriaByAsignatura(asignatura);
        const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
        // Buscar en el map de competencias
        const compData = cal?.competencias?.[competencia.id];
        const value = compData?.[nextCell.periodo as keyof typeof compData];
        return typeof value === 'number' && value !== 0 ? value : null;
      }
    }
    return null;
  }, [estudiante.calificaciones, findMateriaByAsignatura, modulosTecnicos]);

  // Guardar y cerrar celda actual (Mejorado para competencias)
  const saveAndCloseCell = useCallback(async (claseId: string | null, periodo: string, cellId: string, moveToNext?: EditableCell | null) => {
    if (!claseId) {
      setEditingCell(null);
      if (moveToNext) {
        const nextValue = getCellValue(moveToNext);
        setEditingCell(moveToNext.cellId);
        setTempValue(nextValue !== null ? nextValue.toString() : '');
      }
      return;
    }

    const num = tempValue === '' ? null : parseFloat(tempValue);
    if (num !== null && (isNaN(num) || num < 0 || num > 100)) {
      toast.error('Valor debe ser entre 0 y 100');
      return;
    }

    // Extraer competenciaId del cellId si no es un módulo
    let compId: string | undefined = undefined;
    if (!cellId.startsWith('modulo-')) {
      const parts = cellId.split('-');
      if (parts.length >= 2) compId = parts[1]; // El ID de la competencia está en la segunda parte
    }

    setIsSaving(true);
    try {
      await onSaveCalificacion(claseId, estudiante.id, periodo, num, compId);
      setEditingCell(null);

      if (moveToNext) {
        setTimeout(() => {
          const nextValue = getCellValue(moveToNext);
          setEditingCell(moveToNext.cellId);
          setTempValue(nextValue !== null ? nextValue.toString() : '');
        }, 100);
      }
    } catch {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  }, [tempValue, onSaveCalificacion, estudiante.id, getCellValue]);

  // Manejar blur de celda
  const handleCellBlur = useCallback((claseId: string | null, periodo: string, cellId: string) => {
    if (!isSaving) {
      saveAndCloseCell(claseId, periodo, cellId);
    }
  }, [isSaving, saveAndCloseCell]);

  // Manejar teclas en celda
  const handleCellKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, claseId: string | null, periodo: string, currentCellId: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCell = findNextCell(currentCellId, e.shiftKey);
      saveAndCloseCell(claseId, periodo, currentCellId, nextCell);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const nextCell = findNextCell(currentCellId, false);
      saveAndCloseCell(claseId, periodo, currentCellId, nextCell);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue('');
    }
  }, [findNextCell, saveAndCloseCell]);

  const handlePrint = () => {
    if (!printContentRef.current) return;

    const contenido = printContentRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Boletín - ${estudiante.apellido.toUpperCase()} ${estudiante.segundoApellido ? estudiante.segundoApellido.toUpperCase() : ''}, ${estudiante.nombre} ${estudiante.segundoNombre || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            table { border-collapse: collapse; }
            @page {
              size: 35.56cm 21.59cm;
              margin: 0;
            }
            .boletin-page {
              page-break-after: always;
              border: none !important;
              width: 35.56cm !important;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .boletin-page {
                page-break-after: always;
                border: none !important;
                width: 35.56cm !important;
              }
            }
          </style>
        </head>
        <body>${contenido}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Detectar si es sistema Haitiano
  const isHT = sabanaData.metadatos.pais === 'HT';

  return (
    <>
      {/* CONTROLES (No se imprimen) */}
      <div className="no-print p-4 bg-white border-b flex items-center justify-between sticky top-0 z-50">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la lista
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <Select
            value={currentIndex.toString()}
            onValueChange={(val) => onStudentChange(parseInt(val))}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{estudiantes.map((est, idx) => (
                <SelectItem key={est.id} value={idx.toString()}>
                  {idx + 1}. {est.apellido.toUpperCase()} {est.segundoApellido ? est.segundoApellido.toUpperCase() : ''}, {est.nombre} {est.segundoNombre || ''}
                </SelectItem>
              ))}</SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={currentIndex === totalEstudiantes - 1}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button variant="default" size="sm" onClick={handlePrint} className="bg-blue-900 hover:bg-black">
          <Printer className="w-4 h-4 mr-2" />
          IMPRIMIR BOLETÍN
        </Button>
      </div>

      {/* Instrucciones para la sábana de notas */}
      {!isReadOnly && (
        <div className="no-print bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 mx-4 mt-4 rounded">
          <strong>📝 Instrucciones:</strong>
          <ul className="mt-2 ml-4 list-disc">
            <li>Solo puede editar las celdas de la asignatura que usted imparte (resaltadas en azul)</li>
            <li>Las demás asignaturas están en solo lectura</li>
            <li>Presione <strong>Tab</strong> para avanzar a la siguiente celda</li>
            <li>Las notas se guardan automáticamente al salir de la celda</li>
          </ul>
        </div>
      )}

      {/* BOLETÍN PARA IMPRESIÓN - Formato Legal Horizontal */}
      <div ref={printContentRef} className="print-content p-4">
        {/* ==================== LADO A: CALIFICACIONES ==================== */}
        <div
          className="boletin-page bg-white relative mx-auto"
          style={{
            width: '38cm',
            maxWidth: '38cm',
            minHeight: '21.59cm',
            padding: '0.8cm',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10px',
            border: '1px solid #ccc',
            marginBottom: '20px',
            pageBreakAfter: 'always',
          }}
        >
          {/* Contenido Principal */}
          <div>
            {/* Franja negra: CALIFICACIONES DE RENDIMIENTO */}
            <div style={{
              backgroundColor: 'black',
              color: 'white',
              textAlign: 'center',
              padding: '7px 15px',
              fontWeight: 'bold',
              fontSize: '13px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              marginBottom:'40px'
            }}>
              CALIFICACIONES DE RENDIMIENTO
            </div>

           
            {(() => {
              // const gn = sabanaData.nivel?.gradoNumero || 0;
              const gn = sabanaData.nivel?.gradoNumero || (() => {
  const match = sabanaData.nivel?.nombre?.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
})();
              const sufijo = gn === 2 ? 'do' : gn <= 3 ? 'ro' : 'to';
              const gradoColores: Record<number, string> = {
                1: '#2563eb', 2: '#16a34a', 3: '#9333ea',
                4: '#dc2626', 5: '#ea580c', 6: '#0891b2',
              };
              const gradoColor = gradoColores[gn] || '#1e3a8a';
              console.log('gradoNumero:', sabanaData.nivel?.gradoNumero, typeof sabanaData.nivel?.gradoNumero);

              return (
                <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '10px', marginBottom: '0' }}>
                  {/* Cuadro: Nombres y Apellidos */}
                  <div style={{
                    border: '2px solid black',
                    padding: '4px 8px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.3',
                  }}>
                    Nombres y Apellidos
                  </div>

                  {/* Nombre sobre la raya */}
                  <div style={{
                    flex: 1,
                    borderBottom: '2px solid black',
                    paddingBottom: '2px',
                    paddingLeft: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}>
                    {estudiante.nombre} {estudiante.segundoNombre ? estudiante.segundoNombre + ' ' : ''}{estudiante.apellido} {estudiante.segundoApellido || ''}
                  </div>

                

                  {/* Bloque: Número + GRADO */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                    {/* Numero del grado - posicionado para superponerse sobre el cuadro GRADO */}
                    {gn > 0 && (
                      <div style={{
                        position: 'relative',
                        zIndex: 1,
                        lineHeight: '1',
                        paddingLeft: '6px',
                        paddingRight: '2px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        marginRight: '-10px',
                      }}>
                        <span style={{
                          fontSize: '100px',
                          fontWeight: '900',
                          color: gradoColor,
                          lineHeight: '0.20',
                        }}>
                          {gn}
                        </span>
                        {/* Sufijo tocando el borde superior del cuadro GRADO */}
                        <sup style={{
                          fontSize: '30px',
                          fontWeight: 'bold',
                          color: gradoColor,
                          position: 'absolute',
                          right: '-34px',
                          bottom: '10px',
                          marginTop:'-10px'
                        }}>
                          {sufijo}
                        </sup>
                      </div>
                    )}

                    {/* Cuadro negro: GRADO */}
                    <div style={{
                      backgroundColor: 'black',
                      color: 'white',
                      padding: '8px 16px',
                      fontWeight: 'bold',
                      fontSize: '17px',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      letterSpacing: '2px',
                      
                    }}>
                      GRADO
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ciclo educativo y nivel debajo del grado */}
            <div style={{
              textAlign: 'right',
              fontSize: '9px',
              marginBottom: '8px',
              lineHeight: '1.5',
            }}>
              <p style={{ margin: 0 }}>
                {(() => {
                  const gn = sabanaData.nivel?.gradoNumero || 0;
                  return gn >= 1 && gn <= 3 ? 'Primer Ciclo' : 'Segundo Ciclo';
                })()}
              </p>
              <p style={{ margin: 0 }}>
                {getFormatoSabana(sabanaData.sistemaEducativo) === 'primaria' ? 'Nivel Primario' :
                 getFormatoSabana(sabanaData.sistemaEducativo) === 'inicial' ? 'Nivel Inicial' : 'Nivel Secundario'}
              </p>
            </div>

            {/* TÍTULO ASIGNATURAS GENERALES */}
            <div style={{
              backgroundColor: colorPrimario,
              color: 'white',
              padding: '4px 8px',
              fontWeight: 'bold',
              fontSize: '10px',
              marginBottom: '3px'
            }}>
              {isHT ? 'MATIÈRES GÉNÉRALES' : 'ASIGNATURAS GENERALES (FORMACIÓN FUNDAMENTAL)'}
            </div>

            {/* TABLA DE COMPETENCIAS - ASIGNATURAS GENERALES */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '10px',
              fontSize: '8px'
            }}>
              <thead>
                <tr style={{ backgroundColor: colorPrimario, color: 'white' }}>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '3px', width: '12%', textAlign: 'left' }}>
                    {isHT ? 'MATIÈRES' : 'ASIGNATURAS'}
                  </th>
                  {COMPETENCIAS.map(comp => (
                    <th key={comp.id} colSpan={8} style={{ border: '1px solid black', padding: '1px', fontSize: '7px' }}>
                      {comp.corto}
                    </th>
                  ))}
                  <th colSpan={4} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', fontSize: '7px' }}>
                    {isHT ? 'PÉRIODES' : 'PROM. PER.'}
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', width: '2.5%' }}>
                    {isHT ? 'MOY.' : 'C.F.'}
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', width: '2.5%' }}>
                    %A.A.
                  </th>
                  {/* Columnas dinámicas según país */}
                  {isHT ? (
                    <>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#e5e7eb', color: 'black', width: '6%' }}>
                        REPÊCHAGE
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#d1d5db', color: 'black', width: '6%' }}>
                        SESSION EXTRA
                      </th>
                    </>
                  ) : (
                    <>
                      <th colSpan={4} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#e5e7eb', color: 'black', fontSize: '7px' }}>
                        CALIFICACIÓN COMPLETIVA
                      </th>
                      <th colSpan={4} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#d1d5db', color: 'black', fontSize: '7px' }}>
                        CALIFICACIÓN EXTRAORDINARIA
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#9ca3af', color: 'black', width: '2.5%' }}>
                        C.E.
                      </th>
                    </>
                  )}
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', width: '2.5%' }}>
                    {isHT ? 'RES.' : 'SIT.'}
                  </th>
                </tr>
                <tr style={{ backgroundColor: colorClaro }}>
                  {COMPETENCIAS.map(comp => (
                    PERIODOS.map(p => (
                      <th key={`${comp.id}-${p}`} style={{
                        border: '1px solid black',
                        padding: '0px',
                        fontSize: '6px',
                        backgroundColor: p.startsWith('RP') ? '#e5e7eb' : 'transparent',
                        minWidth: '18px'
                      }}>
                        {p}
                      </th>
                    ))
                  ))}
                  {['P1', 'P2', 'P3', 'P4'].map(p => (
                    <th key={`prom-${p}`} style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#fef3c7' }}>
                      {p}
                    </th>
                  ))}
                  
                  {/* Headers específicos por país */}
                  {!isHT && (
                    <>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#e5e7eb' }}>50% PCP</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#e5e7eb' }}>CPC</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#e5e7eb' }}>50% CPC</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#e5e7eb', fontWeight: 'bold' }}>C.C.</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#d1d5db' }}>30% PCP</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#d1d5db' }}>CPEx</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#d1d5db' }}>70% CPEx</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#d1d5db', fontWeight: 'bold' }}>C.Ex.</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {ASIGNATURAS_GENERALES_MINERD.map((asignatura, idx) => {
                  const materia = findMateriaByAsignatura(asignatura);
                  const isSelectedMateria = materia && selectedMateriaId === materia.id;
                  const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
                  const canEdit = materia ? canEditMateria(materia.id, cal) : false;
                  const cf = calcularCF(cal, isHT);
                  const situacion = calcularSituacion(cf);

                  return (
                    <tr key={idx} style={{
                      backgroundColor: isSelectedMateria ? '#fff7ed' : 'transparent',
                      outline: isSelectedMateria ? '2px solid #f97316' : 'none',
                      zIndex: isSelectedMateria ? 10 : 0,
                      position: 'relative'
                    }}>
                      <td style={{
                        border: '1px solid black',
                        padding: '2px',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        fontSize: '8px',
                        backgroundColor: isSelectedMateria ? '#ffedd5' : (canEdit && !isReadOnly ? '#e0f2fe' : 'transparent')
                      }}>
                        {asignatura.nombre}
                        {isSelectedMateria && <span style={{ color: '#f97316', fontSize: '7px' }}> (Seleccionada)</span>}
                        {!isSelectedMateria && canEdit && !isReadOnly && <span style={{ color: '#059669', fontSize: '7px' }}> (e)</span>}
                      </td>
                      {COMPETENCIAS.map(comp => (
                        PERIODOS.map(p => {
                          const pLower = p.toLowerCase() as 'p1' | 'rp1' | 'p2' | 'rp2' | 'p3' | 'rp3' | 'p4' | 'rp4';
                          // NUEVO: Buscar valor específico de ESTA competencia
                          const valor = cal?.competencias?.[comp.id]?.[pLower] || 0;
                          const cellId = `${asignatura.codigo}-${comp.id}-${p}`;
                          const isEditing = editingCell === cellId;

                          return (
                            <td
                              key={cellId}
                              style={{
                                border: '1px solid black',
                                padding: '1px',
                                textAlign: 'center',
                                fontSize: '8px',
                                backgroundColor: isEditing ? '#fef9c3' : (p.startsWith('RP') ? '#f3f4f6' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent')),
                                color: valor > 0 && valor < 70 ? '#dc2626' : 'inherit',
                                fontWeight: valor > 0 && valor < 70 ? 'bold' : 'normal',
                                cursor: canEdit && !isReadOnly ? 'pointer' : 'default',
                                transition: 'background-color 0.15s ease',
                                minWidth: '22px',
                                height: '22px'
                              }}
                              onClick={() => handleCellClick(cellId, valor || null, canEdit)}
                            >
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => handleCellBlur(cal?.claseId || null, pLower, cellId)}
                                  onKeyDown={(e) => handleCellKeyDown(e, cal?.claseId || null, pLower, cellId)}
                                  autoFocus
                                  disabled={isSaving}
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    textAlign: 'center',
                                    fontSize: '8px',
                                    backgroundColor: '#fef9c3',
                                    outline: 'none',
                                    padding: '2px'
                                  }}
                                />
                              ) : (
                                valor > 0 ? valor : '-'
                              )}
                            </td>
                          );
                        })
                      ))}
                      {/* Promedios por periodo */}
                      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '8px' }}>
                        {calcularPromedioPeriodo(cal, 'p1', 'rp1') || '-'}
                      </td>
                      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '8px' }}>
                        {calcularPromedioPeriodo(cal, 'p2', 'rp2') || '-'}
                      </td>
                      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '8px' }}>
                        {calcularPromedioPeriodo(cal, 'p3', 'rp3') || '-'}
                      </td>
                      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '8px' }}>
                        {calcularPromedioPeriodo(cal, 'p4', 'rp4') || '-'}
                      </td>
                      {/* C.F. */}
                      <td style={{
                        border: '1px solid black',
                        padding: '1px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: '#fef3c7',
                        fontSize: '9px',
                        color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit'
                      }}>
                        {cf || '-'}
                      </td>
                      {/* %AA */}
                      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#fef3c7', fontSize: '8px' }}>
                        -
                      </td>
                      
                      {/* Columnas Variables */}
                      {isHT ? (
                        <>
                          <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>
                            {cal?.cc || '-'} {/* Reusamos CC para Repêchage */}
                          </td>
                          <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#d1d5db', fontSize: '8px' }}>
                            {cal?.cex || '-'} {/* Reusamos CEX para Session Extra */}
                          </td>
                        </>
                      ) : (
                        (() => {
                          const cpcNota = cal?.cpcNota ?? 0;
                          const cpexNota = cal?.cpexNota ?? 0;
                          const pcp50 = cf > 0 && cf < 70 ? Math.round(cf * 0.5) : 0;
                          const cpc50 = cpcNota > 0 ? Math.round(cpcNota * 0.5) : 0;
                          const ccCalc = cf > 0 && cf < 70 && cpcNota > 0 ? Math.round(cf * 0.5 + cpcNota * 0.5) : 0;
                          const pcp30 = cf > 0 && cf < 70 ? Math.round(cf * 0.3) : 0;
                          const cpex70Calc = cpexNota > 0 ? Math.round(cpexNota * 0.7) : 0;
                          const cexCalc = cf > 0 && cf < 70 && cpexNota > 0 ? Math.round(cf * 0.3 + cpexNota * 0.7) : 0;
                          const cpcCellId = `${asignatura.codigo}-cpc_nota`;
                          const cpexCellId = `${asignatura.codigo}-cpex_nota`;
                          const isEditingCpc = editingCell === cpcCellId;
                          const isEditingCpex = editingCell === cpexCellId;
                          const canEditCpc = canEdit && !isReadOnly && cf > 0 && cf < 70;

                          return (
                            <>
                              {/* 50% PCP */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>
                                {pcp50 > 0 ? pcp50 : '-'}
                              </td>
                              {/* CPC (editable raw grade) */}
                              <td
                                style={{
                                  border: '1px solid black',
                                  padding: '1px',
                                  textAlign: 'center',
                                  backgroundColor: isEditingCpc ? '#fef9c3' : (canEditCpc ? '#dbeafe' : '#e5e7eb'),
                                  fontSize: '8px',
                                  cursor: canEditCpc ? 'pointer' : 'default',
                                  color: cpcNota > 0 && cpcNota < 70 ? '#dc2626' : 'inherit',
                                  fontWeight: cpcNota > 0 && cpcNota < 70 ? 'bold' : 'normal',
                                  minWidth: '22px',
                                  height: '22px'
                                }}
                                onClick={() => canEditCpc && handleCellClick(cpcCellId, cpcNota || null, true)}
                              >
                                {isEditingCpc ? (
                                  <input
                                    type="number" min="0" max="100" step="1"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => handleCellBlur(cal?.claseId || null, 'cpc_nota', cpcCellId)}
                                    onKeyDown={(e) => handleCellKeyDown(e, cal?.claseId || null, 'cpc_nota', cpcCellId)}
                                    autoFocus disabled={isSaving}
                                    style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '8px', backgroundColor: '#fef9c3', outline: 'none', padding: '2px' }}
                                  />
                                ) : (cpcNota > 0 ? cpcNota : '-')}
                              </td>
                              {/* 50% CPC */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>
                                {cpc50 > 0 ? cpc50 : '-'}
                              </td>
                              {/* C.C. */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e5e7eb', fontSize: '8px' }}>
                                {ccCalc > 0 ? ccCalc : '-'}
                              </td>
                              {/* 30% PCP */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#d1d5db', fontSize: '8px' }}>
                                {pcp30 > 0 ? pcp30 : '-'}
                              </td>
                              {/* CPEx (editable raw grade) */}
                              <td
                                style={{
                                  border: '1px solid black',
                                  padding: '1px',
                                  textAlign: 'center',
                                  backgroundColor: isEditingCpex ? '#fef9c3' : (canEditCpc ? '#dbeafe' : '#d1d5db'),
                                  fontSize: '8px',
                                  cursor: canEditCpc ? 'pointer' : 'default',
                                  color: cpexNota > 0 && cpexNota < 70 ? '#dc2626' : 'inherit',
                                  fontWeight: cpexNota > 0 && cpexNota < 70 ? 'bold' : 'normal',
                                  minWidth: '22px',
                                  height: '22px'
                                }}
                                onClick={() => canEditCpc && handleCellClick(cpexCellId, cpexNota || null, true)}
                              >
                                {isEditingCpex ? (
                                  <input
                                    type="number" min="0" max="100" step="1"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => handleCellBlur(cal?.claseId || null, 'cpex_nota', cpexCellId)}
                                    onKeyDown={(e) => handleCellKeyDown(e, cal?.claseId || null, 'cpex_nota', cpexCellId)}
                                    autoFocus disabled={isSaving}
                                    style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '8px', backgroundColor: '#fef9c3', outline: 'none', padding: '2px' }}
                                  />
                                ) : (cpexNota > 0 ? cpexNota : '-')}
                              </td>
                              {/* 70% CPEx */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#d1d5db', fontSize: '8px' }}>
                                {cpex70Calc > 0 ? cpex70Calc : '-'}
                              </td>
                              {/* C.Ex. */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#d1d5db', fontSize: '8px' }}>
                                {cexCalc > 0 ? cexCalc : '-'}
                              </td>
                              {/* C.E. */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#9ca3af', fontSize: '8px' }}>
                                -
                              </td>
                            </>
                          );
                        })()
                      )}

                      {/* Situación */}
                      <td style={{
                        border: '1px solid black',
                        padding: '1px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: situacion === 'A' ? '#dcfce7' : situacion === 'R' ? '#fee2e2' : '#f3f4f6',
                        fontSize: '8px'
                      }}>
                        {situacion}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* TÍTULO MÓDULOS TÉCNICOS - Solo para sistemas Politécnicos */}
            {modulosTecnicos.length > 0 && getFormatoSabana(sabanaData.sistemaEducativo) === 'politecnico' && (
              <>
                <div style={{
                  backgroundColor: colorPrimario,
                  color: 'white',
                  padding: '4px 8px',
                  fontWeight: 'bold',
                  fontSize: '9px',
                  marginBottom: '3px'
                }}>
                  BLOQUE DE LOS MÓDULOS FORMATIVOS
                </div>

                {/* TABLA DE MÓDULOS TÉCNICOS */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', marginBottom: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: colorPrimario, color: 'white' }}>
                      <th style={{ border: '1px solid black', padding: '4px', width: '30%', textAlign: 'left' }}>MÓDULO TÉCNICO</th>
                      {RAS_DISPLAY.map(ra => (
                        <th key={ra} style={{ border: '1px solid black', padding: '3px' }}>{ra}</th>
                      ))}
                      <th style={{ border: '1px solid black', padding: '3px', backgroundColor: '#fbbf24', color: 'black', width: '7%' }}>C.F.</th>
                      <th style={{ border: '1px solid black', padding: '3px', backgroundColor: '#fbbf24', color: 'black', width: '7%' }}>SIT.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modulosTecnicos.map((modulo, idx) => {
                      const isSelectedMateria = selectedMateriaId === modulo.id;
                      const cal = estudiante.calificaciones[modulo.id];
                      const canEdit = canEditMateria(modulo.id, cal);
                      
                      // Calcular CF de los RAs (Promedio simple por ahora)
                      let sumRa = 0;
                      let countRa = 0;
                      if (cal?.ras) {
                        Object.values(cal.ras).forEach(val => {
                          if (val > 0) { sumRa += val; countRa++; }
                        });
                      }
                      const cf = countRa > 0 ? Math.round(sumRa / countRa) : 0;
                      const situacion = calcularSituacion(cf);

                      return (
                        <tr key={idx} style={{
                          backgroundColor: isSelectedMateria ? '#fff7ed' : 'transparent',
                          outline: isSelectedMateria ? '2px solid #f97316' : 'none',
                          zIndex: isSelectedMateria ? 10 : 0,
                          position: 'relative'
                        }}>
                          <td style={{
                            border: '1px solid black',
                            padding: '4px',
                            fontWeight: 'bold',
                            fontSize: '7px',
                            backgroundColor: isSelectedMateria ? '#ffedd5' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent')
                          }}>
                            {modulo.nombre || ''}
                            {isSelectedMateria && <span style={{ color: '#f97316', fontSize: '6px' }}> (Seleccionada)</span>}
                            {!isSelectedMateria && canEdit && !isReadOnly && <span style={{ color: '#059669', fontSize: '5px' }}> (e)</span>}
                          </td>
                          {RAS_DISPLAY.map(ra => {
                            const valor = cal?.ras?.[ra] || 0;
                            const cellId = `modulo-${modulo.id}-${ra}`;
                            const isEditingThis = editingCell === cellId;

                            return (
                              <td
                                key={cellId}
                                style={{
                                  border: '1px solid black',
                                  padding: '3px',
                                  textAlign: 'center',
                                  fontSize: '8px',
                                  backgroundColor: isEditingThis ? '#fef9c3' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent'),
                                  color: valor > 0 && valor < 70 ? '#dc2626' : 'inherit',
                                  fontWeight: valor > 0 && valor < 70 ? 'bold' : 'normal',
                                  cursor: canEdit && !isReadOnly ? 'pointer' : 'default',
                                  minWidth: '25px',
                                  height: '25px'
                                }}
                                onClick={() => handleCellClick(cellId, valor || null, canEdit)}
                              >
                                {isEditingThis ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={tempValue}
                                    onChange={(e) => setTempValue(e.target.value)}
                                    onBlur={() => handleCellBlur(cal?.claseId || null, ra, cellId)}
                                    onKeyDown={(e) => handleCellKeyDown(e, cal?.claseId || null, ra, cellId)}
                                    autoFocus
                                    disabled={isSaving}
                                    style={{
                                      width: '100%',
                                      border: 'none',
                                      textAlign: 'center',
                                      fontSize: '8px',
                                      backgroundColor: '#fef9c3',
                                      outline: 'none',
                                      padding: '0'
                                    }}
                                  />
                                ) : (
                                  valor > 0 ? valor : '-'
                                )}
                              </td>
                            );
                          })}
                          <td style={{
                            border: '1px solid black',
                            padding: '3px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: '#fef3c7',
                            fontSize: '9px',
                            color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit'
                          }}>
                            {cf || '-'}
                          </td>
                          <td style={{
                            border: '1px solid black',
                            padding: '3px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: situacion === 'A' ? '#dcfce7' : situacion === 'R' ? '#fee2e2' : '#f3f4f6',
                            fontSize: '9px'
                          }}>
                            {situacion}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* Fila de totales y resumen */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '10px',
              marginBottom: '10px',
              fontSize: '8px'
            }}>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <strong>{isHT ? 'Repêchage' : 'Calificación Completiva'}:</strong> ____
              </div>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <strong>{isHT ? 'Session Extra' : 'Calificación Extraordinaria'}:</strong> ____
              </div>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <strong>{isHT ? 'Observation' : 'Evaluación Especial'}:</strong> ____
              </div>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center', backgroundColor: '#fef3c7' }}>
                <strong>PROMEDIO GENERAL:</strong> {
                  (() => {
                    const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                      const m = findMateriaByAsignatura(a);
                      return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
                    }).filter((cf: number) => cf > 0);
                    return cfs.length > 0 ? Math.round(cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length) : '-';
                  })()
                }
              </div>
              <div style={{
                border: '1px solid black',
                padding: '5px',
                textAlign: 'center',
                backgroundColor: (() => {
                  const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                    const m = findMateriaByAsignatura(a);
                    return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
                  }).filter((cf: number) => cf > 0);
                  const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                  return prom >= 70 ? '#dcfce7' : prom > 0 ? '#fee2e2' : '#f3f4f6';
                })(),
                fontWeight: 'bold'
              }}>
                <strong>SITUACIÓN FINAL:</strong> {
                  (() => {
                    const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                      const m = findMateriaByAsignatura(a);
                      return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
                    }).filter((cf: number) => cf > 0);
                    const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                    return prom >= 70 ? (isHT ? 'ADMIS' : 'APROBADO') : prom > 0 ? (isHT ? 'ÉCHEC' : 'REPROBADO') : (isHT ? 'EN COURS' : 'PENDIENTE');
                  })()
                }
              </div>
            </div>

            {/* Leyenda de competencias */}
            <div style={{ fontSize: '6px', marginTop: '5px', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
              <strong>{isHT ? 'Compétences:' : 'Competencias:'}</strong> {COMPETENCIAS.map(c => `${c.corto} = ${c.nombre}`).join(' | ')}
              <br />
              <strong>{isHT ? 'Légende:' : 'Leyenda:'}</strong> P = {isHT ? 'Période' : 'Período'} | RP = {isHT ? 'Récupération' : 'Recuperación'} | C.F. = {isHT ? 'Note Finale' : 'Calificación Final'} | %A.A. = % {isHT ? 'Présence' : 'Asistencia Acumulada'} | SIT. = {isHT ? 'Résultat' : 'Situación'}
            </div>
          </div>
        </div>

        {/* ==================== LADO B: INFORMACIÓN Y FIRMAS ==================== */}
        <div
          className="boletin-page bg-white relative mx-auto"
          style={{
            width: '38cm',
            height: '21.59cm',
            padding: '1cm',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            border: '1px solid #ccc',
          }}
        >
          {/* Header Lado B */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colorPrimario,
            color: 'white',
            padding: '15px 20px',
            marginBottom: '20px'
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                INSTITUCIÓN EDUCATIVA
              </h2>
              <p style={{ margin: 0, fontSize: '11px', fontStyle: 'italic' }}>
                La visión del futuro
              </p>
            </div>
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/a/a7/Logo_MINERD.png"
              alt="MINERD"
              style={{ width: '50px', backgroundColor: 'white', padding: '5px', borderRadius: '5px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Columna Izquierda: Información */}
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: colorPrimario, borderBottom: `2px solid ${colorPrimario}`, paddingBottom: '5px' }}>
                  {isHT ? 'INFORMATION DE L\'ÉTUDIANT' : 'INFORMACIÓN DEL ESTUDIANTE'}
                </h3>
                <p style={{ margin: '8px 0' }}><strong>{isHT ? 'Nom Complet' : 'Nombre Completo'}:</strong> {estudiante.apellido.toUpperCase()} {estudiante.segundoApellido ? estudiante.segundoApellido.toUpperCase() : ''}, {estudiante.nombre} {estudiante.segundoNombre || ''}</p>
                <p style={{ margin: '8px 0' }}><strong>{isHT ? 'Matricule' : 'Matrícula'}:</strong> ________________________</p>
                <p style={{ margin: '8px 0' }}><strong>{isHT ? 'Niveau' : 'Nivel/Grado'}:</strong> {sabanaData.nivel?.nombre || '________________________'}</p>
                <p style={{ margin: '8px 0' }}><strong>{isHT ? 'École' : 'Centro Educativo'}:</strong> ________________________</p>
                <p style={{ margin: '8px 0' }}><strong>{isHT ? 'Code' : 'Código del Centro'}:</strong> ____</p>
              </div>

              {/* Situación Final */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: colorPrimario, borderBottom: `2px solid ${colorPrimario}`, paddingBottom: '5px' }}>
                  {isHT ? 'RÉSULTAT FINAL' : 'SITUACIÓN FINAL DEL ESTUDIANTE'}
                </h3>
                <p style={{ margin: '10px 0' }}>{isHT ? 'Cochez avec un X:' : 'Marca con una X:'}</p>
                <div style={{ display: 'flex', gap: '30px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '25px',
                      height: '25px',
                      border: '2px solid black',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {(() => {
                        const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                          const m = findMateriaByAsignatura(a);
                          return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
                        }).filter((cf: number) => cf > 0);
                        const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                        return prom >= 70 ? 'X' : '';
                      })()}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>{isHT ? 'ADMIS' : 'PROMOVIDO'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '25px',
                      height: '25px',
                      border: '2px solid black',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {(() => {
                        const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                          const m = findMateriaByAsignatura(a);
                          return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
                        }).filter((cf: number) => cf > 0);
                        const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                        return prom > 0 && prom < 70 ? 'X' : '';
                      })()}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>{isHT ? 'ÉCHEC' : 'REPROBADO'}</span>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: colorPrimario, borderBottom: `2px solid ${colorPrimario}`, paddingBottom: '5px' }}>
                  {isHT ? 'OBSERVATIONS' : 'OBSERVACIONES'}
                </h3>
                <div style={{ borderBottom: '1px solid #ccc', height: '25px', marginTop: '15px' }}></div>
                <div style={{ borderBottom: '1px solid #ccc', height: '25px' }}></div>
                <div style={{ borderBottom: '1px solid #ccc', height: '25px' }}></div>
              </div>
            </div>

            {/* Columna Derecha: Firmas */}
            <div>
              <div style={{
                backgroundColor: 'black',
                color: 'white',
                padding: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                marginBottom: '15px'
              }}>
                {isHT ? 'SIGNATURE DU PARENT / TUTEUR' : 'FIRMA DEL PADRE, MADRE O TUTOR'}
              </div>

              <h4 style={{ color: colorPrimario, marginBottom: '10px' }}>{isHT ? 'Périodes de Rapport:' : 'Período de Reportes de Calificaciones:'}</h4>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>{isHT ? '1ère Période / Contrôle:' : '1er Período (Agosto - Sept - Oct):'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>{isHT ? '2ème Période / Contrôle:' : '2do Período (Nov - Dic - Enero):'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>{isHT ? '3ème Période / Contrôle:' : '3er Período (Feb - Marzo):'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>{isHT ? '4ème Période / Contrôle:' : '4to Período (Abril - Mayo - Jun):'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px' }}>
                  <span style={{ fontWeight: 'bold' }}>{isHT ? 'Fin d\'Année:' : 'Fin de Año:'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Firmas al final */}
          <div style={{
            position: 'absolute',
            bottom: '2cm',
            left: '1cm',
            right: '1cm',
            display: 'flex',
            justifyContent: 'space-around'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', width: '200px', marginBottom: '5px' }}></div>
              <span style={{ fontWeight: 'bold' }}>{isHT ? 'Signature de l\'Enseignant' : 'Firma del Docente / Maestro Encargado'}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', width: '200px', marginBottom: '5px' }}></div>
              <span style={{ fontWeight: 'bold' }}>{isHT ? 'Signature du Directeur' : 'Firma del Director(a)'}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Quitar spinners/flechas de inputs numéricos */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        @media print {
          @page { size: 35.56cm 21.59cm; margin: 0; }
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .boletin-page { page-break-after: always; border: none !important; width: 35.56cm !important; }
        }
      `}</style>
    </>
  );
}

// ==================== COMPONENTE PRINCIPAL ====================

export default function SabanaNotasPage() {
  const { user } = useAuthStore();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ciclosLectivos, setCiclosLectivos] = useState<CicloLectivo[]>([]);
  const [selectedNivel, setSelectedNivel] = useState<string>('');
  const [selectedCiclo, setSelectedCiclo] = useState<string>('');
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>('all');
  const [sabanaData, setSabanaData] = useState<SabanaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  const isDocente = user?.role === 'DOCENTE';
  const isReadOnly = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'COORDINADOR' || user?.role === 'COORDINADOR_ACADEMICO';

  // Obtener materias del docente para el nivel seleccionado
  const materiasDocente = useMemo(() => {
    if (!sabanaData || !isDocente) return [];
    return sabanaData.materias.filter(m => {
      // Verificar si el docente tiene permiso en al menos un estudiante para esta materia
      return sabanaData.estudiantes.some(est => {
        const cal = est.calificaciones[m.id];
        return cal && cal.docenteId === user?.id;
      });
    });
  }, [sabanaData, isDocente, user?.id]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [nivelesRes, ciclosRes] = await Promise.all([
          sabanaApi.getNiveles(),
          sabanaApi.getCiclosLectivos(),
        ]);
        setNiveles(nivelesRes.data);
        setCiclosLectivos(ciclosRes.data);
        const cicloActivo = ciclosRes.data.find((c: CicloLectivo) => c.activo);
        if (cicloActivo) setSelectedCiclo(cicloActivo.id);
      } catch {
        toast.error('Error al cargar datos iniciales');
      } finally {
        setLoadingData(false);
      }
    };
    loadInitialData();
  }, []);

  const loadSabana = useCallback(async () => {
    if (!selectedNivel || !selectedCiclo) return;
    setLoading(true);
    try {
      const response = await sabanaApi.getSabana(selectedNivel, selectedCiclo);
      setSabanaData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar datos');
      setSabanaData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNivel, selectedCiclo]);

  useEffect(() => { loadSabana(); }, [loadSabana]);

  const canEditMateria = useCallback((materiaId: string, cal: Calificacion | undefined) => {
    // Debug: descomentar para diagnosticar problemas de edición
    console.log('canEditMateria check:', {
      materiaId,
      userRole: user?.role,
      userId: user?.id,
      isDocente,
      calExists: !!cal,
      calDocenteId: cal?.docenteId,
      calClaseId: cal?.claseId,
      match: cal?.docenteId === user?.id
    });

    if (!isDocente) return false;
    if (!cal || !cal.docenteId) return false;
    return cal.docenteId === user?.id;
  }, [isDocente, user?.id, user?.role]);

  const handleSaveCalificacion = async (claseId: string, estudianteId: string, periodo: string, valor: number | null, competenciaId?: string) => {
    await sabanaApi.updateCalificacion({ claseId, estudianteId, periodo: periodo as any, valor, competenciaId });
    toast.success('Calificación guardada');
    loadSabana();
  };

  const handlePublicar = async (claseId: string) => {
    if (!selectedCiclo) return;
    if (!confirm('¿Está seguro de publicar estas calificaciones? Los estudiantes podrán ver las notas.')) return;

    setIsPublishing(true);
    try {
      await sabanaApi.publicar(claseId, selectedCiclo);
      toast.success('Calificaciones publicadas exitosamente');
      loadSabana();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al publicar calificaciones');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSelectStudent = (index: number) => {
    setCurrentStudentIndex(index);
    setViewMode('boletin');
  };

  if (loadingData) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

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
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Boletín de Calificaciones</h1>
      <Card><CardContent className="pt-4">
        <div className={`grid grid-cols-1 ${isDocente && materiasDocente.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          <div>
            <label className="text-sm font-medium mb-1 block">Nivel / Grado</label>
            <Select value={selectedNivel} onValueChange={(val) => {
              setSelectedNivel(val);
              setSelectedMateriaId('all');
            }}>
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
                <SelectTrigger>
                  <SelectValue placeholder="Todas sus materias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas sus materias</SelectItem>
                  {materiasDocente.map((materia) => (
                    <SelectItem key={materia.id} value={materia.id}>
                      {materia.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent></Card>
      {!loading && sabanaData && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-3">Estado de publicacion por materia</h3>
            <div className="space-y-2">
              {sabanaData.materias
                .filter(m => {
                  // For docente, only show their materias
                  if (isDocente) {
                    return sabanaData.estudiantes.some(est => {
                      const cal = est.calificaciones[m.id];
                      return cal && cal.docenteId === user?.id;
                    });
                  }
                  return true;
                })
                .map(materia => {
                  // Find the claseId for this materia
                  const firstEstWithCal = sabanaData.estudiantes.find(est => est.calificaciones[materia.id]?.claseId);
                  const claseId = firstEstWithCal?.calificaciones[materia.id]?.claseId;

                  // Check publication status
                  const calificaciones = sabanaData.estudiantes
                    .map(est => est.calificaciones[materia.id])
                    .filter(Boolean);
                  const totalCals = calificaciones.length;
                  const publicadas = calificaciones.filter(c => c?.publicado).length;
                  const todasPublicadas = totalCals > 0 && publicadas === totalCals;
                  const algunaPublicada = publicadas > 0;

                  // Check if user can publish
                  const canPublish = claseId && (
                    user?.role === 'DIRECTOR' ||
                    user?.role === 'COORDINADOR' ||
                    user?.role === 'COORDINADOR_ACADEMICO' ||
                    (isDocente && calificaciones.some(c => c?.docenteId === user?.id))
                  );

                  return (
                    <div key={materia.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {todasPublicadas ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-sm font-medium">{materia.nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          todasPublicadas
                            ? 'bg-green-100 text-green-700'
                            : algunaPublicada
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {todasPublicadas ? 'Publicado' : algunaPublicada ? `${publicadas}/${totalCals} publicadas` : 'Borrador'}
                        </span>
                      </div>
                      {canPublish && !todasPublicadas && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublicar(claseId!)}
                          disabled={isPublishing}
                          className="text-xs"
                        >
                          {isPublishing ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Send className="w-3 h-3 mr-1" />
                          )}
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
      {loading ? <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div> : sabanaData && (
        <StudentList estudiantes={sabanaData.estudiantes} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSelectStudent={handleSelectStudent} />
      )}
    </div>
  );
}
