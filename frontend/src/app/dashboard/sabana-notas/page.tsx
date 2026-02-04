'use client';

import { useEffect, useState, useCallback } from 'react';
import { sabanaApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileSpreadsheet, Search, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

// ==================== COMPETENCIAS MINERD ====================

const COMPETENCIAS_MINERD = [
  { id: 'COM', nombre: 'Comunicativa', abrev: 'COMUNIC.' },
  { id: 'PLC', nombre: 'Pensamiento Lógico, Creativo y Crítico', abrev: 'PENSAM. LÓGICO CREATIVO Y CRÍT.' },
  { id: 'RDP', nombre: 'Resolución de Problemas', abrev: 'RESOLUC. DE PROB.' },
  { id: 'CYT', nombre: 'Científica y Tecnológica', abrev: 'CIENTÍF. Y TECNO.' },
  { id: 'AYS', nombre: 'Ambiental y de la Salud', abrev: 'AMBIENT. Y SALUD' },
  { id: 'ECD', nombre: 'Ética y Ciudadana / Des. Personal y Espiritual', abrev: 'ÉTICA Y CIUDADAN. DES.PERS. Y ESPIR.' },
];

// Sub-columnas por competencia
const SUB_COLUMNAS = ['P1', 'RP1', 'P2'];

// ==================== ASIGNATURAS OFICIALES MINERD ====================

const ASIGNATURAS_MINERD = [
  { codigo: 'LE', nombre: 'Lengua Española' },
  { codigo: 'IN', nombre: 'Lengua Extranjera - Inglés' },
  { codigo: 'MA', nombre: 'Matemáticas' },
  { codigo: 'CS', nombre: 'Ciencias Sociales' },
  { codigo: 'CN', nombre: 'Ciencias de la Naturaleza' },
  { codigo: 'EA', nombre: 'Educación Artística' },
  { codigo: 'EF', nombre: 'Educación Física' },
  { codigo: 'FIHR', nombre: 'Form. Int. Hum. y Religiosa' },
];

// ==================== ESTILOS ====================

const cellStyle = 'border border-gray-400 px-1 py-0.5 text-[10px] text-center';
const headerStyle = 'border border-gray-400 px-1 py-1 text-[9px] font-bold text-center bg-gray-100';
const groupHeaderStyle = 'border border-gray-400 px-1 py-1 text-[9px] font-bold text-center bg-gray-200';

// ==================== COMPONENTE CELDA EDITABLE ====================

function EditableCell({
  value,
  editable,
  onChange,
  className,
}: {
  value: number | null;
  editable: boolean;
  onChange: (val: number | null) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value?.toString() || '');

  const handleBlur = () => {
    setEditing(false);
    const num = tempValue === '' ? null : parseFloat(tempValue);
    if (num !== null && (isNaN(num) || num < 0 || num > 100)) {
      toast.error('Valor debe ser entre 0 y 100');
      setTempValue(value?.toString() || '');
      return;
    }
    if (num !== value) {
      onChange(num);
    }
  };

  if (editing && editable) {
    return (
      <input
        type="number"
        min="0"
        max="100"
        step="1"
        className={cn('w-full h-full text-center text-[10px] border-0 outline-none bg-yellow-50', className)}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBlur();
          if (e.key === 'Escape') {
            setTempValue(value?.toString() || '');
            setEditing(false);
          }
        }}
        autoFocus
      />
    );
  }

  const displayValue = value !== null && value !== 0 ? value : '';
  const bgColor = value !== null && value !== 0
    ? value >= 70 ? 'bg-green-50' : 'bg-red-50'
    : '';

  return (
    <div
      className={cn(
        'w-full h-full flex items-center justify-center cursor-pointer min-h-[18px]',
        editable && 'hover:bg-blue-50',
        bgColor,
        className
      )}
      onClick={() => editable && setEditing(true)}
      title={editable ? 'Click para editar' : ''}
    >
      {displayValue}
    </div>
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
      } catch (error) {
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar sábana');
      setSabanaData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNivel, selectedCiclo]);

  useEffect(() => {
    loadSabana();
  }, [loadSabana]);

  // Filtrar estudiantes
  const estudiantesFiltrados = sabanaData?.estudiantes.filter((est) => {
    const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
    return nombreCompleto.includes(searchTerm.toLowerCase());
  }) || [];

  // Permisos
  const canEdit = user?.role === 'DIRECTOR' || user?.role === 'DOCENTE';

  // Handler guardar calificación
  const handleSaveCalificacion = async (
    estudianteId: string,
    claseId: string | null,
    periodo: 'p1' | 'p2' | 'p3' | 'p4' | 'rp1' | 'rp2' | 'rp3' | 'rp4',
    valor: number | null
  ) => {
    if (!claseId) {
      toast.error('Estudiante no inscrito en esta materia');
      return;
    }
    try {
      await sabanaApi.updateCalificacion({ claseId, estudianteId, periodo, valor });
      toast.success('Guardado');
      await loadSabana();
    } catch {
      toast.error('Error al guardar');
    }
  };

  // Calcular promedio de competencias (simulado - por ahora usa el promedio de la materia)
  const calcularPromedioCompetencias = (cal: Calificacion | undefined, periodo: 'p1' | 'p2' | 'p3' | 'p4') => {
    if (!cal) return null;
    return cal[periodo];
  };

  // Calcular CF (Calificación Final)
  const calcularCF = (cal: Calificacion | undefined) => {
    if (!cal) return null;
    const valores = [cal.p1, cal.p2, cal.p3, cal.p4].filter(v => v !== null && v !== 0) as number[];
    if (valores.length === 0) return null;
    return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
  };

  // Calcular situación final
  const calcularSituacion = (cf: number | null) => {
    if (cf === null) return '';
    return cf >= 70 ? 'A' : 'R';
  };

  // Imprimir
  const handlePrint = () => {
    window.print();
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header - oculto en impresión */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Sábana de Notas - Formato MINERD</h1>
          <p className="text-muted-foreground text-sm">
            Boletín de Calificaciones - Modalidad Técnico Profesional
          </p>
        </div>
        <div className="flex gap-2">
          {sabanaData && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          )}
        </div>
      </div>

      {/* Filtros - oculto en impresión */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <label className="text-sm font-medium mb-1 block">Buscar estudiante</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado vacío */}
      {(!selectedNivel || !selectedCiclo) && (
        <Card className="print:hidden">
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Seleccione un nivel y año escolar</h3>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Cargando sábana de notas...</p>
          </CardContent>
        </Card>
      )}

      {/* TABLA PRINCIPAL - FORMATO MINERD */}
      {sabanaData && !loading && estudiantesFiltrados.length > 0 && (
        <div className="overflow-x-auto print:overflow-visible">
          {/* Encabezado del boletín para impresión */}
          <div className="hidden print:block text-center mb-4">
            <p className="text-[10px]">REPÚBLICA DOMINICANA - MINISTERIO DE EDUCACIÓN</p>
            <p className="text-[9px]">Viceministerio de Servicios Técnicos y Pedagógicos</p>
            <p className="text-xs font-bold mt-2">BOLETÍN DE CALIFICACIONES</p>
            <p className="text-[10px]">{sabanaData.nivel.nombre} - {sabanaData.cicloLectivo.nombre}</p>
          </div>

          <table className="w-full border-collapse text-[10px] min-w-[1400px]">
            <thead>
              {/* Fila 1: Grupos principales */}
              <tr>
                <th rowSpan={3} className={cn(groupHeaderStyle, 'w-[120px] sticky left-0 bg-gray-200 z-10')}>
                  NOMBRES Y<br/>APELLIDOS
                </th>
                <th rowSpan={3} className={cn(groupHeaderStyle, 'w-[100px]')}>
                  ASIGNATURAS
                </th>
                <th colSpan={COMPETENCIAS_MINERD.length * SUB_COLUMNAS.length} className={groupHeaderStyle}>
                  CALIFICACIONES DEL AÑO ESCOLAR
                </th>
                <th colSpan={4} className={groupHeaderStyle}>
                  PROMEDIO<br/>COMPETENCIAS
                </th>
                <th rowSpan={3} className={cn(groupHeaderStyle, 'w-[40px]')}>
                  C.F.<br/>%A.A
                </th>
                <th colSpan={3} className={groupHeaderStyle}>
                  CALIFICACIÓN<br/>COMPLETIVA
                </th>
                <th colSpan={3} className={groupHeaderStyle}>
                  CALIFICACIÓN<br/>EXTRAORDINARIA
                </th>
                <th rowSpan={3} className={cn(groupHeaderStyle, 'w-[40px]')}>
                  C.E.
                </th>
                <th rowSpan={3} className={cn(groupHeaderStyle, 'w-[50px]')}>
                  SITUACIÓN<br/>FINAL
                </th>
              </tr>

              {/* Fila 2: Nombres de competencias */}
              <tr>
                {COMPETENCIAS_MINERD.map((comp) => (
                  <th key={comp.id} colSpan={SUB_COLUMNAS.length} className={headerStyle}>
                    <span className="text-[8px] leading-tight block">{comp.abrev}</span>
                  </th>
                ))}
                {/* Promedio competencias */}
                <th className={headerStyle}>P1</th>
                <th className={headerStyle}>P2</th>
                <th className={headerStyle}>P3</th>
                <th className={headerStyle}>P4</th>
                {/* Completiva */}
                <th className={headerStyle}>50%<br/>PCP</th>
                <th className={headerStyle}>50%<br/>CPC</th>
                <th className={headerStyle}>C.C.</th>
                {/* Extraordinaria */}
                <th className={headerStyle}>30%<br/>PCP</th>
                <th className={headerStyle}>70%<br/>CPEx</th>
                <th className={headerStyle}>C.Ex</th>
              </tr>

              {/* Fila 3: Sub-columnas de competencias */}
              <tr>
                {COMPETENCIAS_MINERD.map((comp) => (
                  SUB_COLUMNAS.map((sub) => (
                    <th key={`${comp.id}-${sub}`} className={cn(headerStyle, 'w-[28px]')}>
                      {sub}
                    </th>
                  ))
                ))}
                {/* Espacios para las columnas de promedio, completiva, etc. ya tienen rowSpan */}
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
                <th className={headerStyle}></th>
              </tr>
            </thead>

            <tbody>
              {estudiantesFiltrados.map((estudiante) => {
                // Obtener asignaturas del estudiante desde sabanaData.materias
                const asignaturas = sabanaData.materias;

                return asignaturas.map((materia, materiaIdx) => {
                  const cal = estudiante.calificaciones[materia.id];
                  const isFirstRow = materiaIdx === 0;
                  const isLastRow = materiaIdx === asignaturas.length - 1;

                  // Permisos de edición
                  const canEditThis = user?.role === 'DIRECTOR' ||
                    (user?.role === 'DOCENTE' && cal?.docenteId === user?.id);

                  // Cálculos
                  const cf = calcularCF(cal);
                  const situacion = calcularSituacion(cf);

                  return (
                    <tr key={`${estudiante.id}-${materia.id}`} className={isLastRow ? 'border-b-2 border-gray-600' : ''}>
                      {/* Nombre del estudiante - solo en primera fila */}
                      {isFirstRow && (
                        <td
                          rowSpan={asignaturas.length}
                          className={cn(cellStyle, 'font-medium text-left px-2 align-top sticky left-0 bg-white z-10')}
                        >
                          <div className="py-1">
                            {estudiante.apellido.toUpperCase()},<br/>
                            {estudiante.nombre}
                          </div>
                        </td>
                      )}

                      {/* Nombre de la asignatura */}
                      <td className={cn(cellStyle, 'text-left px-1 text-[9px]')}>
                        {materia.nombre}
                      </td>

                      {/* Celdas de competencias (P1, RP1, P2 por cada competencia) */}
                      {COMPETENCIAS_MINERD.map((comp) => (
                        SUB_COLUMNAS.map((sub) => {
                          // Mapear sub-columna a campo de calificación
                          const periodoMap: Record<string, 'p1' | 'p2' | 'rp1' | 'rp2'> = {
                            'P1': 'p1',
                            'RP1': 'rp1',
                            'P2': 'p2',
                          };
                          const periodo = periodoMap[sub];
                          const valor = cal?.[periodo] ?? null;

                          return (
                            <td key={`${comp.id}-${sub}`} className={cellStyle}>
                              <EditableCell
                                value={valor}
                                editable={canEditThis && canEdit && !!cal?.claseId}
                                onChange={(v) => handleSaveCalificacion(estudiante.id, cal?.claseId || null, periodo, v)}
                              />
                            </td>
                          );
                        })
                      ))}

                      {/* Promedio competencias P1-P4 */}
                      <td className={cellStyle}>
                        {calcularPromedioCompetencias(cal, 'p1') || ''}
                      </td>
                      <td className={cellStyle}>
                        {calcularPromedioCompetencias(cal, 'p2') || ''}
                      </td>
                      <td className={cellStyle}>
                        {calcularPromedioCompetencias(cal, 'p3') || ''}
                      </td>
                      <td className={cellStyle}>
                        {calcularPromedioCompetencias(cal, 'p4') || ''}
                      </td>

                      {/* CF */}
                      <td className={cn(cellStyle, cf !== null && cf >= 70 ? 'bg-green-100' : cf !== null ? 'bg-red-100' : '')}>
                        {cf || ''}
                      </td>

                      {/* Completiva: 50% PCP, 50% CPC, C.C. */}
                      <td className={cellStyle}></td>
                      <td className={cellStyle}></td>
                      <td className={cellStyle}></td>

                      {/* Extraordinaria: 30% PCP, 70% CPEx, C.Ex */}
                      <td className={cellStyle}></td>
                      <td className={cellStyle}></td>
                      <td className={cellStyle}></td>

                      {/* C.E. */}
                      <td className={cellStyle}></td>

                      {/* Situación Final */}
                      <td className={cn(
                        cellStyle,
                        'font-bold',
                        situacion === 'A' ? 'bg-green-200 text-green-800' : situacion === 'R' ? 'bg-red-200 text-red-800' : ''
                      )}>
                        {situacion}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>

          {/* Leyenda */}
          <div className="mt-4 p-3 bg-gray-50 border rounded text-[9px] print:mt-2 print:p-2">
            <p className="font-bold mb-1">LEYENDA:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <span>C.F. = Calificación Final</span>
              <span>%A.A. = Porcentaje Asistencia Acumulada</span>
              <span>P.C.P. = Promedio Calificaciones Parciales</span>
              <span>C.C. = Calificación Completiva</span>
              <span>C.P.C. = Calificación Prueba Completiva</span>
              <span>C.P.Ex. = Calificación Prueba Extraordinaria</span>
              <span>C.Ex. = Calificación Extraordinaria</span>
              <span>C.E. = Calificación Especial</span>
              <span className="text-green-700">A = Aprobado (≥70)</span>
              <span className="text-red-700">R = Reprobado (&lt;70)</span>
            </div>
          </div>
        </div>
      )}

      {/* Sin estudiantes */}
      {sabanaData && !loading && estudiantesFiltrados.length === 0 && (
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

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
