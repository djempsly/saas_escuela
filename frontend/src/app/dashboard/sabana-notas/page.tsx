"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { sabanaApi, institucionesApi } from '@/lib/api';
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
  observaciones?: string | null;
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

// Lista de RAs para mostrar en la tabla (10 RAs, cada uno con 3 sub-columnas)
const RAS_DISPLAY = ['RA1', 'RA2', 'RA3', 'RA4', 'RA5', 'RA6', 'RA7', 'RA8', 'RA9', 'RA10'];
const RA_SUBCOLS = [
  { key: '', label: 'C.R.A' },
  { key: '_RP1', label: 'RP1' },
  { key: '_RP2', label: 'RP2' },
];
const TOTAL_MODULO_ROWS = 5;

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
  institucion,
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
  institucion?: {
    nombre: string; lema: string | null; logoUrl: string | null; colorPrimario: string;
    direccion: string | null; codigoCentro: string | null; distritoEducativo: string | null; regionalEducacion: string | null;
    sabanaColores?: { colores?: Record<string, string>; sombras?: Record<string, string>; franja?: Record<string, string> } | null;
  } | null;
}) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  // Observaciones: tomar la primera que exista de cualquier materia del estudiante
  const getObservacionesData = useCallback(() => {
    for (const materiaId of Object.keys(estudiante.calificaciones || {})) {
      const cal = estudiante.calificaciones[materiaId];
      if (cal?.claseId && cal.observaciones) {
        return { texto: cal.observaciones, claseId: cal.claseId };
      }
    }
    // Si no hay observaciones, devolver el primer claseId disponible para poder guardar
    for (const materiaId of Object.keys(estudiante.calificaciones || {})) {
      const cal = estudiante.calificaciones[materiaId];
      if (cal?.claseId) return { texto: '', claseId: cal.claseId };
    }
    return { texto: '', claseId: null };
  }, [estudiante.calificaciones]);

  const obsData = getObservacionesData();
  const [observacionesText, setObservacionesText] = useState(obsData.texto);
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [obsGuardada, setObsGuardada] = useState(false);

  // Sincronizar cuando cambie de estudiante
  useEffect(() => {
    const data = getObservacionesData();
    setObservacionesText(data.texto);
    setObsGuardada(false);
  }, [estudiante.id, getObservacionesData]);

  const saveObservaciones = async () => {
    if (!obsData.claseId) return;
    setIsSavingObs(true);
    try {
      await sabanaApi.updateCalificacion({
        claseId: obsData.claseId,
        estudianteId: estudiante.id,
        periodo: 'observaciones',
        valorTexto: observacionesText,
      });
      setObsGuardada(true);
      setTimeout(() => setObsGuardada(false), 2000);
    } catch (err) {
      console.error('Error guardando observaciones:', err);
    } finally {
      setIsSavingObs(false);
    }
  };

  // Colores dinámicos según el grado
  const nivelNombre = sabanaData.nivel?.nombre || '';
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
    // 1. Código exacto (máxima prioridad)
    const byCode = materias.find(m => m.codigo === asignatura.codigo);
    if (byCode) return byCode;

    // 2. Nombre completo contenido en el otro (evita falsos positivos con primera palabra)
    const asigNombre = asignatura.nombre.toLowerCase();
    const byFullName = materias.find(m => {
      const mNombre = m.nombre.toLowerCase();
      return mNombre === asigNombre || mNombre.includes(asigNombre) || asigNombre.includes(mNombre);
    });
    if (byFullName) return byFullName;

    // 3. Fallback: primeras dos palabras para mayor especificidad
    const asigWords = asigNombre.split(/\s+/);
    const searchKey = asigWords.length >= 2 ? asigWords.slice(0, 2).join(' ') : asigWords[0];
    return materias.find(m => {
      const mNombre = m.nombre.toLowerCase();
      const mWords = mNombre.split(/\s+/);
      const mKey = mWords.length >= 2 ? mWords.slice(0, 2).join(' ') : mWords[0];
      return mNombre.includes(searchKey) || searchKey.includes(mKey);
    });
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

    // Módulos técnicos (cada RA tiene 3 sub-columnas: CRA, RP1, RP2)
    modulosTecnicos.forEach((modulo, modIdx) => {
      const cal = estudiante.calificaciones[modulo.id];
      const canEdit = canEditMateria(modulo.id, cal);

      if (canEdit && !isReadOnly) {
        RAS_DISPLAY.forEach((ra, raIdx) => {
          RA_SUBCOLS.forEach((subcol, subIdx) => {
            const raKey = `${ra}${subcol.key}`;
            const cellId = `modulo-${modulo.id}-${raKey}`;
            cells.push({
              cellId,
              claseId: cal?.claseId || null,
              periodo: raKey,
              asignaturaIndex: ASIGNATURAS_GENERALES_MINERD.length + modIdx,
              competenciaIndex: 0,
              periodoIndex: raIdx * 3 + subIdx,
            });
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

    // Extraer competenciaId del cellId si no es un módulo ni una nota completiva/extraordinaria
    let compId: string | undefined = undefined;
    const isCpcOrCpex = cellId.endsWith('-cpc_nota') || cellId.endsWith('-cpex_nota');
    if (!cellId.startsWith('modulo-') && !isCpcOrCpex) {
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
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .boletin-page {
                page-break-after: always;
                border: none !important;
                width: 35.56cm !important;
              }
              img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
              const sufijo = gn === 2 ? 'do' : gn <= 3 ? 'er' : 'to';
              const defaultColores: Record<number, string> = {
                1: '#2563eb', 2: '#16a34a', 3: '#9333ea',
                4: '#dc2626', 5: '#ea580c', 6: '#0891b2',
              };
              const savedColores = institucion?.sabanaColores?.colores;
              const gradoColor = (savedColores && savedColores[String(gn)]) || defaultColores[gn] || '#1e3a8a';
              const defaultSombras: Record<number, string> = {
                1: '#1e40af', 2: '#166534', 3: '#6b21a8',
                4: '#991b1b', 5: '#c2410c', 6: '#0e7490',
              };
              const savedSombras = institucion?.sabanaColores?.sombras;
              const gradoSombra = (savedSombras && savedSombras[String(gn)]) || defaultSombras[gn] || '#000';
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
                          textShadow: `3px 3px 6px ${gradoSombra}`,
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
                          marginTop:'-10px',
                          textShadow: `2px 2px 4px ${gradoSombra}`,
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
              backgroundColor: '#fef3c7',
              color: 'black',
              padding: '4px 8px',
              fontWeight: 'bold',
              fontSize: '10px',
              marginBottom: '3px',
              border: '1px solid black',
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
                <tr style={{ backgroundColor: '#fef3c7', color: 'black' }}>
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
                      <th colSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#9ca3af', color: 'white', fontSize: '7px' }}>
                        EVALUACIÓN ESPECIAL
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
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#9ca3af', color: 'white', fontWeight: 'bold' }}>C.F.</th>
                      <th style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#9ca3af', color: 'white', fontWeight: 'bold' }}>C.E.</th>
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

                          // COMPLETIVA: 50% CF original + 50% nota completiva
                          const pcp50 = cf > 0 && cf < 70 ? Math.round(cf * 0.5) : 0;
                          const cpc50 = cpcNota > 0 ? Math.round(cpcNota * 0.5) : 0;
                          const ccCalc = cf > 0 && cf < 70 && cpcNota > 0 ? Math.round(cf * 0.5 + cpcNota * 0.5) : 0;

                          // EXTRAORDINARIA: Solo se activa si C.C. existe y es < 70
                          // Fórmula: 30% CF original + 70% nota extraordinaria
                          const needsExtraordinaria = ccCalc > 0 && ccCalc < 70;
                          const pcp30 = needsExtraordinaria ? Math.round(cf * 0.3) : 0;
                          const cpex70Calc = needsExtraordinaria && cpexNota > 0 ? Math.round(cpexNota * 0.7) : 0;
                          const cexCalc = needsExtraordinaria && cpexNota > 0 ? Math.round(cf * 0.3 + cpexNota * 0.7) : 0;

                          const cpcCellId = `${asignatura.codigo}-cpc_nota`;
                          const cpexCellId = `${asignatura.codigo}-cpex_nota`;
                          const isEditingCpc = editingCell === cpcCellId;
                          const isEditingCpex = editingCell === cpexCellId;
                          const canEditCpc = canEdit && !isReadOnly && cf > 0 && cf < 70;
                          const canEditCpex = canEdit && !isReadOnly && needsExtraordinaria;

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
                              {/* CPEx (editable raw grade) - Solo se habilita si C.C. < 70 */}
                              <td
                                style={{
                                  border: '1px solid black',
                                  padding: '1px',
                                  textAlign: 'center',
                                  backgroundColor: isEditingCpex ? '#fef9c3' : (canEditCpex ? '#dbeafe' : '#d1d5db'),
                                  fontSize: '8px',
                                  cursor: canEditCpex ? 'pointer' : 'default',
                                  color: cpexNota > 0 && cpexNota < 70 ? '#dc2626' : 'inherit',
                                  fontWeight: cpexNota > 0 && cpexNota < 70 ? 'bold' : 'normal',
                                  minWidth: '22px',
                                  height: '22px'
                                }}
                                onClick={() => canEditCpex && handleCellClick(cpexCellId, cpexNota || null, true)}
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
                              {/* Evaluación Especial: C.F. */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#9ca3af', color: 'white', fontSize: '8px' }}>
                                -
                              </td>
                              {/* Evaluación Especial: C.E. */}
                              <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#9ca3af', color: 'white', fontSize: '8px' }}>
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
            {getFormatoSabana(sabanaData.sistemaEducativo) === 'politecnico' && (
              <>
                <div style={{
                  backgroundColor: '#f5f1e1',
                  color: 'black',
                  padding: '4px 8px',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  marginBottom: '3px',
                  border: '1px solid black',
                  textAlign: 'center',
                }}>
                  BLOQUE DE LOS MÓDULOS FORMATIVOS
                </div>

                {/* TABLA DE MÓDULOS TÉCNICOS */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', marginBottom: '10px' }}>
                  <thead>
                    {/* Fila 1: "Periodo de Aprobación" arriba a la izquierda + celdas RA vacías sin color */}
                    <tr>
                      <th style={{ border: '1px solid black', padding: '4px', width: '14%', textAlign: 'left', fontSize: '10px', backgroundColor: '#fef3c7', color: 'black' }}>
                        Periodo de Aprobación
                      </th>
                      {RAS_DISPLAY.map((ra) => (
                        <th key={`empty-${ra}`} colSpan={3} style={{ border: '1px solid black', padding: '2px' }}>
                        </th>
                      ))}
                      <th rowSpan={3} style={{
                        border: '1px solid black',
                        padding: '2px',
                        width: '2.5%',
                        backgroundColor: '#fbbf24',
                        color: 'black',
                        verticalAlign: 'middle',
                      }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: '10px', fontWeight: 'bold', margin: '0 auto' }}>
                          CALIFICACIÓN FINAL
                        </div>
                      </th>
                      <th rowSpan={3} style={{
                        border: '1px solid black',
                        padding: '2px',
                        width: '2.5%',
                        backgroundColor: '#e5e7eb',
                        color: 'black',
                        verticalAlign: 'middle',
                      }}>
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: '6px', fontWeight: 'bold', margin: '0 auto' }}>
                          EVALUACIÓN ESPECIAL
                        </div>
                      </th>
                      <th rowSpan={3} style={{
                        border: '1px solid black',
                        padding: '3px',
                        width: '6%',
                        textAlign: 'center',
                        backgroundColor: '#fbbf24',
                        color: 'black',
                        fontSize: '6px',
                        fontWeight: 'bold',
                        verticalAlign: 'middle',
                      }}>
                        SITUACIÓN FINAL DE MÓDULO FORMATIVO
                      </th>
                    </tr>
                    {/* Fila 2: "MÓDULOS FORMATIVOS" (rowSpan=2) + 10 columnas RA sin número */}
                    <tr style={{ backgroundColor: '#fef3c7', color: 'black' }}>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontSize: '7px', verticalAlign: 'middle' }}>
                        MÓDULOS FORMATIVOS
                      </th>
                      {RAS_DISPLAY.map((ra) => (
                        <th key={ra} colSpan={3} style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontSize: '10px' }}>
                          RA
                        </th>
                      ))}
                    </tr>
                    {/* Fila 3: Sub-columnas C.R.A, RP1, RP2 para cada RA */}
                    <tr style={{ backgroundColor: colorClaro }}>
                      {RAS_DISPLAY.flatMap((ra) =>
                        RA_SUBCOLS.map((subcol) => (
                          <th key={`${ra}${subcol.key}`} style={{
                            border: '1px solid black',
                            padding: '1px',
                            fontSize: '5px',
                            minWidth: '14px',
                            backgroundColor: subcol.key !== '' ? '#e5e7eb' : 'transparent',
                          }}>
                            {subcol.label}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: TOTAL_MODULO_ROWS }, (_, rowIdx) => {
                      const modulo = modulosTecnicos[rowIdx];
                      const isSelectedMateria = modulo ? selectedMateriaId === modulo.id : false;
                      const cal = modulo ? estudiante.calificaciones[modulo.id] : undefined;
                      const canEdit = modulo ? canEditMateria(modulo.id, cal) : false;

                      // Calcular CF: promedio de max(CRA, RP1, RP2) por cada RA
                      let sumRa = 0;
                      let countRa = 0;
                      if (cal?.ras) {
                        RAS_DISPLAY.forEach(ra => {
                          const cra = cal.ras?.[ra] || 0;
                          const rp1Val = cal.ras?.[`${ra}_RP1`] || 0;
                          const rp2Val = cal.ras?.[`${ra}_RP2`] || 0;
                          const maxVal = Math.max(cra, rp1Val, rp2Val);
                          if (maxVal > 0) { sumRa += maxVal; countRa++; }
                        });
                      }
                      const cf = countRa > 0 ? Math.round(sumRa / countRa) : 0;
                      const situacion = calcularSituacion(cf);

                      return (
                        <tr key={rowIdx} style={{
                          backgroundColor: isSelectedMateria ? '#fff7ed' : 'transparent',
                          outline: isSelectedMateria ? '2px solid #f97316' : 'none',
                          position: 'relative',
                        }}>
                          <td style={{
                            border: '1px solid black',
                            padding: '4px',
                            fontWeight: 'bold',
                            fontSize: '7px',
                            backgroundColor: isSelectedMateria ? '#ffedd5' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent'),
                            height: '22px',
                          }}>
                            {modulo ? (
                              <>
                                {modulo.nombre || ''}
                                {isSelectedMateria && <span style={{ color: '#f97316', fontSize: '6px' }}> (Seleccionada)</span>}
                                {!isSelectedMateria && canEdit && !isReadOnly && <span style={{ color: '#059669', fontSize: '5px' }}> (e)</span>}
                              </>
                            ) : ''}
                          </td>
                          {/* 10 RAs × 3 sub-columnas = 30 celdas */}
                          {RAS_DISPLAY.flatMap((ra) =>
                            RA_SUBCOLS.map((subcol) => {
                              const raKey = `${ra}${subcol.key}`;
                              const valor = cal?.ras?.[raKey] || 0;
                              const cellId = modulo ? `modulo-${modulo.id}-${raKey}` : `empty-${rowIdx}-${raKey}`;
                              const isEditingThis = editingCell === cellId;

                              return (
                                <td
                                  key={cellId}
                                  style={{
                                    border: '1px solid black',
                                    padding: '1px',
                                    textAlign: 'center',
                                    fontSize: '7px',
                                    backgroundColor: isEditingThis ? '#fef9c3' : (subcol.key !== '' ? '#f3f4f6' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent')),
                                    color: valor > 0 && valor < 70 ? '#dc2626' : 'inherit',
                                    fontWeight: valor > 0 && valor < 70 ? 'bold' : 'normal',
                                    cursor: modulo && canEdit && !isReadOnly ? 'pointer' : 'default',
                                    minWidth: '14px',
                                    height: '22px',
                                  }}
                                  onClick={() => modulo && handleCellClick(cellId, valor || null, canEdit)}
                                >
                                  {isEditingThis ? (
                                    <input
                                      type="number" min="0" max="100" step="1"
                                      value={tempValue}
                                      onChange={(e) => setTempValue(e.target.value)}
                                      onBlur={() => handleCellBlur(cal?.claseId || null, raKey, cellId)}
                                      onKeyDown={(e) => handleCellKeyDown(e, cal?.claseId || null, raKey, cellId)}
                                      autoFocus disabled={isSaving}
                                      style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '7px', backgroundColor: '#fef9c3', outline: 'none', padding: '0' }}
                                    />
                                  ) : (
                                    modulo ? (valor > 0 ? valor : '-') : ''
                                  )}
                                </td>
                              );
                            })
                          )}
                          {/* CALIFICACIÓN FINAL */}
                          <td style={{
                            border: '1px solid black',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: '#fef3c7',
                            fontSize: '8px',
                            color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit',
                          }}>
                            {modulo ? (cf || '-') : ''}
                          </td>
                          {/* EVALUACIÓN ESPECIAL */}
                          <td style={{
                            border: '1px solid black',
                            padding: '2px',
                            textAlign: 'center',
                            backgroundColor: '#e5e7eb',
                            fontSize: '8px',
                          }}>
                            {modulo ? '-' : ''}
                          </td>
                          {/* SITUACIÓN FINAL DE MÓDULO FORMATIVO */}
                          <td style={{
                            border: '1px solid black',
                            padding: '2px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: situacion === 'A' ? '#dcfce7' : situacion === 'R' ? '#fee2e2' : '#f3f4f6',
                            fontSize: '8px',
                          }}>
                            {modulo ? situacion : ''}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: '100%' }}>
            {/* Columna Izquierda: Formulario oficial */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '35px' }}>

              {/* 1. FIRMA DEL PADRE, MADRE O TUTOR */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  backgroundColor: '#2d3a2e', color: 'white', textAlign: 'center',
                  padding: '6px 10px', fontWeight: 'bold', fontSize: '10px',
                  textTransform: 'uppercase' as const, letterSpacing: '1px',
                }}>
                  FIRMA DEL PADRE, MADRE O TUTOR
                </div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', margin: '10px 0 8px' }}>
                  Periodo de Reportes de Calificaciones
                </div>
                <div style={{ paddingLeft: '15px' }}>
                  {[
                    'Agost-Sept-Oct.',
                    'Nov-Dic-Enero',
                    'Feb-Mar',
                    'Abril-May-Jun',
                    'Fin de Año Escolar',
                  ].map((periodo) => (
                    <div key={periodo} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                      <span style={{ fontSize: '9px', minWidth: '120px' }}>{periodo}</span>
                      <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '14px' }}></div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '6px', paddingLeft: '15px' }}>
                  Marca con una X
                </p>
              </div>

              {/* 2. SITUACIÓN FINAL DEL ESTUDIANTE */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  backgroundColor: '#2d3a2e', color: 'white', textAlign: 'center',
                  padding: '6px 10px', fontWeight: 'bold', fontSize: '10px',
                  textTransform: 'uppercase' as const, letterSpacing: '1px',
                }}>
                  SITUACIÓN FINAL DEL ESTUDIANTE
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                  {(() => {
                    const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                      const m = findMateriaByAsignatura(a);
                      return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
                    }).filter((cf: number) => cf > 0);
                    const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                    const esPromovido = prom >= 70;
                    const esReprobado = prom > 0 && prom < 70;

                    return (
                      <>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            background: 'linear-gradient(to bottom, #e5e7eb, #d1d5db)',
                            padding: '6px 20px', fontWeight: 'bold', fontSize: '10px',
                            textTransform: 'uppercase' as const, border: '1px solid #9ca3af',
                          }}>PROMOVIDO</div>
                          <div style={{
                            width: '30px', height: '30px', border: '2px solid black',
                            margin: '6px auto 0', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 'bold', fontSize: '18px',
                          }}>
                            {esPromovido ? 'X' : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            background: 'linear-gradient(to bottom, #e5e7eb, #d1d5db)',
                            padding: '6px 20px', fontWeight: 'bold', fontSize: '10px',
                            textTransform: 'uppercase' as const, border: '1px solid #9ca3af',
                          }}>REPROBADO</div>
                          <div style={{
                            width: '30px', height: '30px', border: '2px solid black',
                            margin: '6px auto 0', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 'bold', fontSize: '18px',
                          }}>
                            {esReprobado ? 'X' : ''}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* 3. OBSERVACIONES */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  backgroundColor: '#2d3a2e', color: 'white', textAlign: 'center',
                  padding: '6px 10px', fontWeight: 'bold', fontSize: '10px',
                  textTransform: 'uppercase' as const, letterSpacing: '1px',
                }}>
                  OBSERVACIONES
                </div>
                {/* Editable en pantalla, texto plano en impresión */}
                <div className="no-print" style={{ marginTop: '8px' }}>
                  <textarea
                    value={observacionesText}
                    onChange={(e) => setObservacionesText(e.target.value)}
                    placeholder="Escriba las observaciones del estudiante..."
                    disabled={isReadOnly}
                    style={{
                      width: '100%', minHeight: '70px', fontSize: '12px', padding: '8px',
                      border: '1px solid #ccc', borderRadius: '4px', resize: 'vertical',
                      fontFamily: 'Arial, sans-serif', lineHeight: '1.5',
                    }}
                  />
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={saveObservaciones}
                      disabled={isSavingObs || isReadOnly}
                      style={{
                        fontSize: '9px', padding: '3px 10px', backgroundColor: '#2d3a2e',
                        color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer',
                        opacity: isSavingObs ? 0.6 : 1,
                      }}
                    >
                      {isSavingObs ? 'Guardando...' : 'Guardar observación'}
                    </button>
                    {obsGuardada && <span style={{ fontSize: '9px', color: 'green' }}>Guardada</span>}
                  </div>
                </div>
                {/* Para impresión: mostrar texto o líneas vacías */}
                <div className="print-only" style={{ display: 'none', marginTop: '8px' }}>
                  {observacionesText ? (
                    <p style={{ fontSize: '9px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {observacionesText}
                    </p>
                  ) : (
                    [...Array(5)].map((_, i) => (
                      <div key={i} style={{ borderBottom: '1px solid black', height: '20px' }}></div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Firmas al pie */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingTop: '25px', paddingBottom: '25px' }}>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderTop: '1px solid black', width: '100%', marginBottom: '4px' }}></div>
                  <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Maestro/Encargado de Curso</span>
                </div>
                <div style={{ textAlign: 'center', width: '45%' }}>
                  <div style={{ borderTop: '1px solid black', width: '100%', marginBottom: '4px' }}></div>
                  <span style={{ fontWeight: 'bold', fontSize: '9px' }}>Director/a del Centro</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Portada del Boletín */}
            {(() => {
              const gn = sabanaData.nivel?.gradoNumero || (() => {
                const match = sabanaData.nivel?.nombre?.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
              })();
              const sufijo = gn === 2 ? 'do' : gn <= 3 ? 'er' : 'to';
              const defaultColores: Record<number, string> = {
                1: '#2563eb', 2: '#16a34a', 3: '#9333ea',
                4: '#dc2626', 5: '#ea580c', 6: '#0891b2',
              };
              const savedColores = institucion?.sabanaColores?.colores;
              const franjaColor = (savedColores && savedColores[String(gn)]) || defaultColores[gn] || '#1e3a8a';
              const defaultSombras: Record<number, string> = {
                1: '#1e40af', 2: '#166534', 3: '#6b21a8',
                4: '#991b1b', 5: '#c2410c', 6: '#0e7490',
              };
              const savedSombras = institucion?.sabanaColores?.sombras;
              const gradoSombra = (savedSombras && savedSombras[String(gn)]) || defaultSombras[gn] || '#000';
              const savedFranja = institucion?.sabanaColores?.franja;
              const franjaVerticalColor = (savedFranja && savedFranja[String(gn)]) || franjaColor;

              return (
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                  {/* Franja VERTICAL a la IZQUIERDA con nombre del centro y lema */}
                  <div style={{
                    backgroundColor: franjaVerticalColor,
                    color: 'white',
                    width: '80px',
                    minWidth: '80px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
                        {institucion?.nombre || 'INSTITUCIÓN EDUCATIVA'}
                      </span>
                      {institucion?.lema && (
                        <span style={{ fontSize: '27px', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                          {institucion.lema}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contenido principal de la columna derecha */}
                  <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Logo MINERD */}
                    <div style={{ marginBottom: '15px' }}>
                      <img
                        src="https://www.ministeriodeeducacion.gob.do/img/logo/logoMinerdHD.svg"
                        alt="MINERD"
                        style={{ width: '100px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}
                      />
                    </div>

                    {/* Instrucciones del ministerio */}
                    <div style={{ fontSize: '10px', lineHeight: '1.6', marginBottom: '10px' }}>
                      <p style={{ margin: 0 }}>Viceministerio de Servicios Técnicos y Pedagógicos</p>
                      <p style={{ margin: 0 }}>Dirección de Educación Secundaria</p>
                      <p style={{ margin: 0 }}>Departamento de la Modalidad de Educación Técnico Profesional</p>
                    </div>

                    {/* Boletín de Calificaciones */}
                    <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '15px', marginBottom: '20px' }}>
                      Boletín de Calificaciones
                    </div>

                    {/* Bloque GRADO (mismo estilo que Lado A) */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '15px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
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
                              color: franjaColor,
                              lineHeight: '0.20',
                              textShadow: `3px 3px 6px ${gradoSombra}`,
                            }}>
                              {gn}
                            </span>
                            <sup style={{
                              fontSize: '30px',
                              fontWeight: 'bold',
                              color: franjaColor,
                              position: 'absolute',
                              right: '-34px',
                              bottom: '10px',
                              marginTop: '-10px',
                              textShadow: `2px 2px 4px ${gradoSombra}`,
                            }}>
                              {sufijo}
                            </sup>
                          </div>
                        )}
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

                    {/* Modalidad */}
                    <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '10px', marginTop: '30px' }}>
                      MODALIDAD TÉCNICO PROFESIONAL
                    </div>

                    {/* Línea separadora */}
                    <div style={{ width: '60%', borderBottom: '2px solid black', marginBottom: '20px' }}></div>

                    {/* Año Escolar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '15px' }}>
                      <div style={{
                        backgroundColor: 'black',
                        color: 'white',
                        padding: '8px 16px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        letterSpacing: '2px',
                      }}>
                        AÑO ESCOLAR
                      </div>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        letterSpacing: '1px',
                      }}>
                        {sabanaData.cicloLectivo?.nombre || '________'}
                      </span>
                    </div>

                    {/* Formulario oficial */}
                    <div style={{ width: '90%', fontSize: '15px' }}>
                      {/* Fila superior: SECCIÓN y NÚMERO DE ORDEN */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{
                            backgroundColor: '#2d3a2e', color: 'white', padding: '4px 8px',
                            fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' as const,
                            whiteSpace: 'nowrap',
                          }}>SECCIÓN</span>
                          <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '16px' }}></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{
                            backgroundColor: '#2d3a2e', color: 'white', padding: '4px 8px',
                            fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' as const,
                            whiteSpace: 'nowrap',
                          }}>NÚMERO DE ORDEN</span>
                          <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '16px' }}></div>
                        </div>
                      </div>

                      {/* Campos verticales del formulario */}
                      {[
                        { label: 'NOMBRES', value: `${estudiante.nombre}${estudiante.segundoNombre ? ` ${estudiante.segundoNombre}` : ''}` },
                        { label: 'APELLIDOS', value: `${estudiante.apellido}${estudiante.segundoApellido ? ` ${estudiante.segundoApellido}` : ''}` },
                        { label: 'NOMBRE DEL CENTRO EDUCATIVO', value: institucion?.nombre || '' },
                        { label: 'CÓDIGO DEL CENTRO', value: institucion?.codigoCentro || '' },
                        { label: 'DIRECCIÓN DEL CENTRO EDUCATIVO', value: institucion?.direccion || '' },
                        { label: 'DISTRITO EDUCATIVO', value: institucion?.distritoEducativo || '' },
                        { label: 'DIRECCIÓN REGIONAL DE EDUCACIÓN', value: institucion?.regionalEducacion || '' },
                      ].map((campo) => (
                        <div key={campo.label} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '8px' }}>
                          <span style={{
                            backgroundColor: '#2d3a2e', color: 'white', padding: '4px 8px',
                            fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' as const,
                            whiteSpace: 'nowrap', minWidth: '70px', textAlign: 'center',
                          }}>{campo.label}</span>
                          <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '16px', fontSize: '15px', paddingBottom: '2px' }}>
                            {campo.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
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
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .boletin-page { page-break-after: always; border: none !important; width: 35.56cm !important; }
          img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
  const [institucion, setInstitucion] = useState<{
    nombre: string; lema: string | null; logoUrl: string | null; colorPrimario: string;
    direccion: string | null; codigoCentro: string | null; distritoEducativo: string | null; regionalEducacion: string | null;
    sabanaColores?: { colores?: Record<string, string>; sombras?: Record<string, string>; franja?: Record<string, string> } | null;
  } | null>(null);

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

        // Cargar datos de la institución (branding es público, no requiere rol ADMIN)
        if (user?.institucionId) {
          try {
            const instRes = await institucionesApi.getBranding(user.institucionId);
            const inst = instRes.data;
            setInstitucion({
              nombre: inst.nombre,
              lema: inst.lema || null,
              logoUrl: inst.logoUrl || null,
              colorPrimario: inst.colorPrimario || '#1a56db',
              direccion: inst.direccion || null,
              codigoCentro: inst.codigoCentro || null,
              distritoEducativo: inst.distritoEducativo || null,
              regionalEducacion: inst.regionalEducacion || null,
              sabanaColores: inst.sabanaColores || null,
            });
          } catch {
            console.error('Error cargando institución');
          }
        }
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
        institucion={institucion}
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
