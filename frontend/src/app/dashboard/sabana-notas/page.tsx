"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Loader2, FileSpreadsheet, Search, Printer, ChevronLeft, ChevronRight, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ==================== TIPOS ====================

interface Materia {
  id: string;
  nombre: string;
  codigo: string | null;
  esOficial: boolean;
  orden: number;
  tipo: string;
}

interface Calificacion {
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
  cpcTotal: number | null;
  cc: number | null;
  cpex30: number | null;
  cpex70: number | null;
  cex: number | null;
  promedioFinal: number | null;
  situacion: string | null;
  claseId: string | null;
  docenteId: string | null;
  docenteNombre: string | null;
}

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
  calificaciones: {
    [materiaId: string]: Calificacion;
  };
}

interface SabanaData {
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
    const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
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
                      {estudiante.apellido.toUpperCase()}, {estudiante.nombre}
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

// ==================== COMPONENTE BOLETÍN INDIVIDUAL - FORMATO MINERD ====================

function BoletinIndividual({
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
  onSaveCalificacion: (claseId: string, estudianteId: string, periodo: string, valor: number | null) => void;
  isReadOnly: boolean;
}) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');

  // Colores dinámicos según el grado
  const nivelNombre = sabanaData.nivel?.nombre || '';
  const colorPrimario = nivelNombre.includes('6to') ? '#8B0000' :
                        nivelNombre.includes('5to') ? '#166534' : '#1e3a8a';
  const colorClaro = nivelNombre.includes('6to') ? '#fef2f2' :
                     nivelNombre.includes('5to') ? '#f0fdf4' : '#eff6ff';

  // Calcular promedio por periodo para una materia
  const calcularPromedioPeriodo = (cal: Calificacion | undefined, periodo: 'p1' | 'p2' | 'p3' | 'p4', rp: 'rp1' | 'rp2' | 'rp3' | 'rp4') => {
    if (!cal) return 0;
    const nota = Math.max(cal[periodo] || 0, cal[rp] || 0);
    return nota;
  };

  // Calcular C.F. (Calificación Final)
  const calcularCF = (cal: Calificacion | undefined) => {
    if (!cal) return 0;
    const valores = [
      calcularPromedioPeriodo(cal, 'p1', 'rp1'),
      calcularPromedioPeriodo(cal, 'p2', 'rp2'),
      calcularPromedioPeriodo(cal, 'p3', 'rp3'),
      calcularPromedioPeriodo(cal, 'p4', 'rp4'),
    ].filter(v => v > 0);
    if (valores.length === 0) return 0;
    return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
  };

  // Calcular situación
  const calcularSituacion = (cf: number) => {
    if (cf === 0) return '';
    return cf >= 70 ? 'A' : 'R';
  };

  // Manejar edición de celda
  const handleCellClick = (cellId: string, currentValue: number | null, canEdit: boolean) => {
    if (!canEdit || isReadOnly) return;
    setEditingCell(cellId);
    setTempValue(currentValue?.toString() || '');
  };

  const handleCellBlur = (claseId: string | null, periodo: string) => {
    if (!claseId) {
      setEditingCell(null);
      return;
    }

    const num = tempValue === '' ? null : parseFloat(tempValue);
    if (num !== null && (isNaN(num) || num < 0 || num > 100)) {
      toast.error('Valor debe ser entre 0 y 100');
      setEditingCell(null);
      return;
    }

    onSaveCalificacion(claseId, estudiante.id, periodo, num);
    setEditingCell(null);
  };

  const handlePrint = () => window.print();

  // Usar asignaturas estáticas del MINERD
  // Buscar la materia del backend que coincida con la asignatura MINERD (por código o nombre)
  const findMateriaByAsignatura = (asignatura: { codigo: string; nombre: string }) => {
    return materias.find(m =>
      m.codigo === asignatura.codigo ||
      m.nombre.toLowerCase().includes(asignatura.nombre.toLowerCase().split(' ')[0]) ||
      asignatura.nombre.toLowerCase().includes(m.nombre.toLowerCase().split(' ')[0])
    );
  };

  // Módulos técnicos del backend (estos sí vienen dinámicos según la especialidad)
  const modulosTecnicos = materias.filter(m => m.tipo === 'TECNICA');

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
            <SelectContent>
              {estudiantes.map((est, idx) => (
                <SelectItem key={est.id} value={idx.toString()}>
                  {idx + 1}. {est.apellido.toUpperCase()}, {est.nombre}
                </SelectItem>
              ))}
            </SelectContent>
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

      {/* Mensaje para docente */}
      {!isReadOnly && (
        <div className="no-print bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 mx-4 mt-4 rounded">
          <strong>Nota:</strong> Solo puede editar las calificaciones de las asignaturas que usted imparte.
          Haga clic en una celda para editar. Las demás filas están en modo solo lectura.
        </div>
      )}

      {/* BOLETÍN PARA IMPRESIÓN - Formato Legal Horizontal */}
      <div className="print-content p-4">
        {/* ==================== LADO A: CALIFICACIONES ==================== */}
        <div
          className="boletin-page bg-white relative mx-auto"
          style={{
            width: '100%',
            maxWidth: '35.56cm',
            minHeight: '21.59cm',
            padding: '0.8cm',
            paddingLeft: '1.5cm',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            fontSize: '9px',
            border: '1px solid #ccc',
            marginBottom: '20px',
          }}
        >
          {/* Franja Lateral Vertical */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '1.2cm',
              height: '100%',
              backgroundColor: colorPrimario,
              color: 'white',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            INSTITUCIÓN EDUCATIVA | La visión del futuro
          </div>

          {/* Contenido Principal */}
          <div style={{ marginLeft: '0.5cm' }}>
            {/* Header con Logo MINERD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ width: '60px', height: '60px', backgroundColor: '#f0f0f0', margin: '0 auto 5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', border: '1px solid #ccc' }}>
                  MINERD
                </div>
                <p style={{ fontSize: '8px', margin: 0, fontWeight: 'bold' }}>Viceministerio de Servicios Técnicos y Pedagógicos</p>
                <p style={{ fontSize: '7px', margin: 0 }}>Dirección de Educación Secundaria</p>
                <p style={{ fontSize: '7px', margin: 0 }}>Departamento de la Modalidad de Educación Técnico Profesional</p>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <h1 style={{ fontSize: '14px', margin: 0, color: colorPrimario, fontWeight: 900 }}>
                  BOLETÍN DE CALIFICACIONES
                </h1>
                <p style={{ fontSize: '11px', margin: '3px 0', fontWeight: 'bold' }}>
                  {nivelNombre || 'Nivel Secundario'}
                </p>
                <p style={{ fontSize: '9px', margin: 0 }}>Modalidad Técnico Profesional</p>
                <p style={{ fontSize: '9px', margin: '3px 0' }}>
                  Año Escolar: {sabanaData.cicloLectivo?.nombre || '20__ - 20__'}
                </p>
              </div>
              <div style={{ textAlign: 'right', flex: 1, fontSize: '8px' }}>
                <p><strong>Estudiante {currentIndex + 1} de {totalEstudiantes}</strong></p>
              </div>
            </div>

            {/* Info del Estudiante */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5px',
              marginBottom: '10px',
              fontSize: '9px',
              borderBottom: `2px solid ${colorPrimario}`,
              paddingBottom: '8px'
            }}>
              <p style={{ margin: 0 }}><strong>Nombre Completo:</strong> {estudiante.apellido.toUpperCase()}, {estudiante.nombre}</p>
              <p style={{ margin: 0 }}><strong>Nivel/Grado:</strong> {nivelNombre}</p>
              <p style={{ margin: 0 }}><strong>Centro Educativo:</strong> ________________</p>
              <p style={{ margin: 0 }}><strong>Código del Centro:</strong> ____</p>
              <p style={{ margin: 0 }}><strong>Distrito Educativo:</strong> ____</p>
              <p style={{ margin: 0 }}><strong>Dirección Regional:</strong> ____</p>
            </div>

            {/* TÍTULO ASIGNATURAS GENERALES */}
            <div style={{
              backgroundColor: colorPrimario,
              color: 'white',
              padding: '4px 8px',
              fontWeight: 'bold',
              fontSize: '9px',
              marginBottom: '3px'
            }}>
              ASIGNATURAS GENERALES (FORMACIÓN FUNDAMENTAL)
            </div>

            {/* TABLA DE COMPETENCIAS - ASIGNATURAS GENERALES */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '10px',
              fontSize: '7px'
            }}>
              <thead>
                <tr style={{ backgroundColor: colorPrimario, color: 'white' }}>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '3px', width: '15%', textAlign: 'left' }}>ASIGNATURAS</th>
                  {COMPETENCIAS.map(comp => (
                    <th key={comp.id} colSpan={8} style={{ border: '1px solid black', padding: '2px', fontSize: '5px' }}>
                      {comp.corto}
                    </th>
                  ))}
                  <th colSpan={4} style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fbbf24', color: 'black', fontSize: '6px' }}>
                    PROM. PER.
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fbbf24', color: 'black', width: '3%' }}>
                    C.F.
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fbbf24', color: 'black', width: '3%' }}>
                    %AA
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fbbf24', color: 'black', width: '3%' }}>
                    SIT.
                  </th>
                </tr>
                <tr style={{ backgroundColor: colorClaro }}>
                  {COMPETENCIAS.map(comp => (
                    PERIODOS.map(p => (
                      <th key={`${comp.id}-${p}`} style={{
                        border: '1px solid black',
                        padding: '1px',
                        fontSize: '5px',
                        backgroundColor: p.startsWith('RP') ? '#e5e7eb' : 'transparent',
                        minWidth: '14px'
                      }}>
                        {p}
                      </th>
                    ))
                  ))}
                  {['P1', 'P2', 'P3', 'P4'].map(p => (
                    <th key={`prom-${p}`} style={{ border: '1px solid black', padding: '1px', fontSize: '5px', backgroundColor: '#fef3c7' }}>
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASIGNATURAS_GENERALES_MINERD.map((asignatura, idx) => {
                  const materia = findMateriaByAsignatura(asignatura);
                  const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
                  const canEdit = materia ? canEditMateria(materia.id, cal) : false;
                  const cf = calcularCF(cal);
                  const situacion = calcularSituacion(cf);

                  return (
                    <tr key={idx}>
                      <td style={{
                        border: '1px solid black',
                        padding: '3px',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        fontSize: '6px',
                        backgroundColor: canEdit && !isReadOnly ? '#e0f2fe' : 'transparent'
                      }}>
                        {asignatura.nombre}
                        {canEdit && !isReadOnly && <span style={{ color: '#059669', fontSize: '5px' }}> (editable)</span>}
                      </td>
                      {COMPETENCIAS.map(comp => (
                        PERIODOS.map(p => {
                          const pLower = p.toLowerCase() as 'p1' | 'rp1' | 'p2' | 'rp2' | 'p3' | 'rp3' | 'p4' | 'rp4';
                          const valor = cal?.[pLower] || 0;
                          const cellId = `${asignatura.codigo}-${comp.id}-${p}`;
                          const isEditing = editingCell === cellId;

                          return (
                            <td
                              key={cellId}
                              style={{
                                border: '1px solid black',
                                padding: '2px',
                                textAlign: 'center',
                                fontSize: '7px',
                                backgroundColor: p.startsWith('RP') ? '#f3f4f6' : (canEdit && !isReadOnly ? '#e0f2fe' : 'transparent'),
                                color: valor > 0 && valor < 70 ? '#dc2626' : 'inherit',
                                fontWeight: valor > 0 && valor < 70 ? 'bold' : 'normal',
                                cursor: canEdit && !isReadOnly ? 'pointer' : 'default'
                              }}
                              onClick={() => handleCellClick(cellId, valor || null, canEdit)}
                            >
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={tempValue}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={() => handleCellBlur(cal?.claseId || null, pLower)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellBlur(cal?.claseId || null, pLower);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  autoFocus
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    textAlign: 'center',
                                    fontSize: '7px',
                                    backgroundColor: '#fef9c3',
                                    outline: 'none'
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
                      <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '7px' }}>
                        {calcularPromedioPeriodo(cal, 'p1', 'rp1') || '-'}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '7px' }}>
                        {calcularPromedioPeriodo(cal, 'p2', 'rp2') || '-'}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '7px' }}>
                        {calcularPromedioPeriodo(cal, 'p3', 'rp3') || '-'}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '7px' }}>
                        {calcularPromedioPeriodo(cal, 'p4', 'rp4') || '-'}
                      </td>
                      {/* C.F. */}
                      <td style={{
                        border: '1px solid black',
                        padding: '2px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: '#fef3c7',
                        fontSize: '8px',
                        color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit'
                      }}>
                        {cf || '-'}
                      </td>
                      {/* %AA */}
                      <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', backgroundColor: '#fef3c7', fontSize: '7px' }}>
                        -
                      </td>
                      {/* Situación */}
                      <td style={{
                        border: '1px solid black',
                        padding: '2px',
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

            {/* TÍTULO MÓDULOS TÉCNICOS */}
            {modulosTecnicos.length > 0 && (
              <>
                <div style={{
                  backgroundColor: colorPrimario,
                  color: 'white',
                  padding: '4px 8px',
                  fontWeight: 'bold',
                  fontSize: '9px',
                  marginBottom: '3px'
                }}>
                  MÓDULOS FORMATIVOS (FORMACIÓN TÉCNICO PROFESIONAL)
                </div>

                {/* TABLA DE MÓDULOS TÉCNICOS (RA) */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6px', marginBottom: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: colorClaro }}>
                      <th style={{ border: '1px solid black', padding: '3px', width: '15%', textAlign: 'left' }}>MÓDULOS</th>
                      {[1,2,3,4,5,6,7,8,9,10].map(i => (
                        <th key={i} colSpan={3} style={{ border: '1px solid black', padding: '2px', fontSize: '6px' }}>RA{i}</th>
                      ))}
                      <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fef3c7', width: '3%' }}>C.F.</th>
                      <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fef3c7', width: '3%' }}>%AA</th>
                      <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fef3c7', width: '3%' }}>SIT.</th>
                    </tr>
                    <tr style={{ fontSize: '5px' }}>
                      <th style={{ border: '1px solid black' }}></th>
                      {[1,2,3,4,5,6,7,8,9,10].flatMap(i => [
                        <th key={`cra-${i}`} style={{ border: '1px solid black', padding: '1px' }}>CRA</th>,
                        <th key={`rp1-${i}`} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#e5e7eb' }}>RP1</th>,
                        <th key={`rp2-${i}`} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#e5e7eb' }}>RP2</th>
                      ])}
                      <th style={{ border: '1px solid black' }}></th>
                      <th style={{ border: '1px solid black' }}></th>
                      <th style={{ border: '1px solid black' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {modulosTecnicos.map((modulo, idx) => {
                      const cal = estudiante.calificaciones[modulo.id];
                      const cf = calcularCF(cal);
                      const situacion = calcularSituacion(cf);

                      return (
                        <tr key={idx}>
                          <td style={{ border: '1px solid black', padding: '3px', fontWeight: 'bold', fontSize: '6px' }}>
                            {modulo.nombre || ''}
                          </td>
                          {[1,2,3,4,5,6,7,8,9,10].flatMap(raNum => [
                            <td key={`cra-${raNum}-${idx}`} style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontSize: '7px' }}>
                              -
                            </td>,
                            <td key={`rp1-${raNum}-${idx}`} style={{ border: '1px solid black', padding: '2px', textAlign: 'center', backgroundColor: '#f3f4f6', fontSize: '7px' }}>
                              -
                            </td>,
                            <td key={`rp2-${raNum}-${idx}`} style={{ border: '1px solid black', padding: '2px', textAlign: 'center', backgroundColor: '#f3f4f6', fontSize: '7px' }}>
                              -
                            </td>
                          ])}
                          <td style={{
                            border: '1px solid black',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: '#fef3c7',
                            fontSize: '8px',
                            color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit'
                          }}>
                            {cf || '-'}
                          </td>
                          <td style={{ border: '1px solid black', textAlign: 'center', backgroundColor: '#fef3c7', fontSize: '7px' }}>
                            -
                          </td>
                          <td style={{
                            border: '1px solid black',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            backgroundColor: situacion === 'A' ? '#dcfce7' : situacion === 'R' ? '#fee2e2' : '#f3f4f6',
                            fontSize: '8px'
                          }}>
                            {modulo.nombre ? situacion : ''}
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
                <strong>Calificación Completiva:</strong> ____
              </div>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <strong>Calificación Extraordinaria:</strong> ____
              </div>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <strong>Evaluación Especial:</strong> ____
              </div>
              <div style={{ border: '1px solid black', padding: '5px', textAlign: 'center', backgroundColor: '#fef3c7' }}>
                <strong>PROMEDIO GENERAL:</strong> {
                  (() => {
                    const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
                      const m = findMateriaByAsignatura(a);
                      return m ? calcularCF(estudiante.calificaciones[m.id]) : 0;
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
                    return m ? calcularCF(estudiante.calificaciones[m.id]) : 0;
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
                      return m ? calcularCF(estudiante.calificaciones[m.id]) : 0;
                    }).filter((cf: number) => cf > 0);
                    const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                    return prom >= 70 ? 'APROBADO' : prom > 0 ? 'REPROBADO' : 'PENDIENTE';
                  })()
                }
              </div>
            </div>

            {/* Leyenda de competencias */}
            <div style={{ fontSize: '6px', marginTop: '5px', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
              <strong>Competencias:</strong> {COMPETENCIAS.map(c => `${c.corto} = ${c.nombre}`).join(' | ')}
              <br />
              <strong>Leyenda:</strong> P = Período | RP = Recuperación | C.F. = Calificación Final | %AA = % Asistencia Acumulada | SIT. = Situación (A=Aprobado, R=Reprobado, P=Pendiente)
            </div>
          </div>
        </div>

        {/* ==================== LADO B: INFORMACIÓN Y FIRMAS ==================== */}
        <div
          className="boletin-page bg-white relative mx-auto"
          style={{
            width: '100%',
            maxWidth: '35.56cm',
            height: '21.59cm',
            padding: '1cm',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10px',
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
            <div style={{ width: '50px', height: '50px', backgroundColor: 'white', padding: '5px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px' }}>
              MINERD
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Columna Izquierda: Información */}
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: colorPrimario, borderBottom: `2px solid ${colorPrimario}`, paddingBottom: '5px' }}>
                  INFORMACIÓN DEL ESTUDIANTE
                </h3>
                <p style={{ margin: '8px 0' }}><strong>Nombre Completo:</strong> {estudiante.apellido.toUpperCase()}, {estudiante.nombre}</p>
                <p style={{ margin: '8px 0' }}><strong>Matrícula:</strong> ________________________</p>
                <p style={{ margin: '8px 0' }}><strong>Nivel/Grado:</strong> {sabanaData.nivel?.nombre || '________________________'}</p>
                <p style={{ margin: '8px 0' }}><strong>Centro Educativo:</strong> ________________________</p>
                <p style={{ margin: '8px 0' }}><strong>Código del Centro:</strong> ________</p>
                <p style={{ margin: '8px 0' }}><strong>Distrito Educativo:</strong> ________</p>
                <p style={{ margin: '8px 0' }}><strong>Dirección Regional:</strong> ________</p>
              </div>

              {/* Situación Final */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: colorPrimario, borderBottom: `2px solid ${colorPrimario}`, paddingBottom: '5px' }}>
                  SITUACIÓN FINAL DEL ESTUDIANTE
                </h3>
                <p style={{ margin: '10px 0' }}>Marca con una X:</p>
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
                          return m ? calcularCF(estudiante.calificaciones[m.id]) : 0;
                        }).filter((cf: number) => cf > 0);
                        const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                        return prom >= 70 ? 'X' : '';
                      })()}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>PROMOVIDO</span>
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
                          return m ? calcularCF(estudiante.calificaciones[m.id]) : 0;
                        }).filter((cf: number) => cf > 0);
                        const prom = cfs.length > 0 ? cfs.reduce((acc: number, val: number) => acc + val, 0) / cfs.length : 0;
                        return prom > 0 && prom < 70 ? 'X' : '';
                      })()}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>REPROBADO</span>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ color: colorPrimario, borderBottom: `2px solid ${colorPrimario}`, paddingBottom: '5px' }}>
                  OBSERVACIONES
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
                FIRMA DEL PADRE, MADRE O TUTOR
              </div>

              <h4 style={{ color: colorPrimario, marginBottom: '10px' }}>Período de Reportes de Calificaciones:</h4>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>1er Período (Agosto - Sept - Oct):</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>2do Período (Nov - Dic - Enero):</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>3er Período (Feb - Marzo):</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>4to Período (Abril - Mayo - Jun):</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid black', paddingBottom: '20px' }}>
                  <span style={{ fontWeight: 'bold' }}>Fin de Año:</span>
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
              <span style={{ fontWeight: 'bold' }}>Firma del Docente / Maestro Encargado</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid black', width: '200px', marginBottom: '5px' }}></div>
              <span style={{ fontWeight: 'bold' }}>Firma del Director(a)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación inferior - solo visible en pantalla */}
      <div className="no-print flex justify-between items-center p-4 border-t bg-white">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Estudiante anterior
        </Button>

        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} de {totalEstudiantes}
        </span>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentIndex === totalEstudiantes - 1}
        >
          Siguiente estudiante
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: legal landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .boletin-page {
            page-break-after: always;
            page-break-inside: avoid;
            border: none !important;
            max-width: none !important;
          }
          .print-content {
            padding: 0 !important;
          }
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
  const [sabanaData, setSabanaData] = useState<SabanaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para navegación
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  // Determinar permisos según rol
  const isEstudiante = user?.role === 'ESTUDIANTE';
  const isDocente = user?.role === 'DOCENTE';
  const isReadOnly = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'COORDINADOR' || user?.role === 'COORDINADOR_ACADEMICO';

  // Cargar niveles y ciclos
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

  // Cargar sábana
  const loadSabana = useCallback(async () => {
    if (!selectedNivel || !selectedCiclo) return;
    setLoading(true);
    try {
      const response = await sabanaApi.getSabana(selectedNivel, selectedCiclo);
      setSabanaData(response.data);

      // Si es estudiante, ir directo a su boletín
      if (isEstudiante && response.data.estudiantes.length > 0) {
        const myIndex = response.data.estudiantes.findIndex(
          (e: Estudiante) => e.id === user?.id
        );
        if (myIndex >= 0) {
          setCurrentStudentIndex(myIndex);
          setViewMode('boletin');
        }
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Error al cargar datos');
      setSabanaData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNivel, selectedCiclo, isEstudiante, user?.id]);

  useEffect(() => {
    loadSabana();
  }, [loadSabana]);

  // Verificar si el docente puede editar una materia específica
  const canEditMateria = useCallback((_materiaId: string, cal: Calificacion | undefined) => {
    if (!isDocente || !cal) return false;
    return cal.docenteId === user?.id;
  }, [isDocente, user?.id]);

  // Guardar calificación
  const handleSaveCalificacion = async (
    claseId: string,
    estudianteId: string,
    periodo: string,
    valor: number | null
  ) => {
    try {
      await sabanaApi.updateCalificacion({
        claseId,
        estudianteId,
        periodo: periodo as 'p1' | 'p2' | 'p3' | 'p4' | 'rp1' | 'rp2' | 'rp3' | 'rp4',
        valor,
      });
      toast.success('Calificación guardada');
      await loadSabana();
    } catch {
      toast.error('Error al guardar calificación');
    }
  };

  // Navegación entre estudiantes
  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    }
  };

  const handleNextStudent = () => {
    if (sabanaData && currentStudentIndex < sabanaData.estudiantes.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const handleSelectStudent = (index: number) => {
    setCurrentStudentIndex(index);
    setViewMode('boletin');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSearchTerm('');
  };

  // Estudiante actual
  const currentStudent = useMemo(() => {
    return sabanaData?.estudiantes[currentStudentIndex];
  }, [sabanaData, currentStudentIndex]);

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si está en modo boletín, mostrar solo el boletín
  if (viewMode === 'boletin' && sabanaData && currentStudent) {
    return (
      <BoletinIndividual
        estudiante={currentStudent}
        materias={sabanaData.materias}
        sabanaData={sabanaData}
        currentIndex={currentStudentIndex}
        totalEstudiantes={sabanaData.estudiantes.length}
        onPrevious={handlePreviousStudent}
        onNext={handleNextStudent}
        onBack={handleBackToList}
        onStudentChange={setCurrentStudentIndex}
        estudiantes={sabanaData.estudiantes}
        canEditMateria={canEditMateria}
        onSaveCalificacion={handleSaveCalificacion}
        isReadOnly={isReadOnly || isEstudiante}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isEstudiante ? 'Mi Boletín de Calificaciones' : 'Boletín de Calificaciones'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isDocente && 'Seleccione un estudiante para ver/editar su boletín'}
            {isReadOnly && 'Vista de solo lectura'}
            {isEstudiante && 'Su boletín de calificaciones del año escolar'}
          </p>
        </div>
      </div>

      {/* Filtros - oculto para estudiantes */}
      {!isEstudiante && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nivel / Grado</label>
                <Select value={selectedNivel} onValueChange={setSelectedNivel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    {niveles.map((nivel) => (
                      <SelectItem key={nivel.id} value={nivel.id}>
                        {nivel.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Año Escolar</label>
                <Select value={selectedCiclo} onValueChange={setSelectedCiclo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ciclosLectivos.map((ciclo) => (
                      <SelectItem key={ciclo.id} value={ciclo.id}>
                        {ciclo.nombre}
                        {ciclo.activo && ' (Activo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vacío */}
      {(!selectedNivel || !selectedCiclo) && !isEstudiante && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Seleccione un nivel y año escolar</h3>
            <p className="text-muted-foreground mt-2">
              Para ver la lista de estudiantes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Cargando datos...</p>
          </CardContent>
        </Card>
      )}

      {/* Vista Lista de Estudiantes */}
      {sabanaData && !loading && !isEstudiante && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {sabanaData.nivel.nombre} - {sabanaData.cicloLectivo.nombre}
            </h2>
            <span className="text-sm text-muted-foreground">
              {sabanaData.estudiantes.length} estudiantes
            </span>
          </div>
          <StudentList
            estudiantes={sabanaData.estudiantes}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSelectStudent={handleSelectStudent}
          />
        </>
      )}

      {/* Sin estudiantes */}
      {sabanaData && !loading && sabanaData.estudiantes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Sin estudiantes</h3>
            <p className="text-muted-foreground mt-2">
              No hay estudiantes inscritos en este nivel.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
