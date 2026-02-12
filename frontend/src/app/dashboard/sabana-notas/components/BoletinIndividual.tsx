'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Estudiante, Materia, SabanaData, Calificacion, InstitucionInfo } from '../types';
import { getFormatoSabana } from '../constants';
import { useSabanaEdit } from '../hooks/useSabanaEdit';
import { SabanaTable } from './SabanaTable';
import { SabanaModulosTecnicos } from './SabanaModulosTecnicos';
import { SabanaSummary } from './SabanaSummary';
import { BoletinLadoB } from './BoletinLadoB';

interface BoletinIndividualProps {
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
  institucion?: InstitucionInfo | null;
}

export function BoletinIndividual({
  estudiante, materias, sabanaData,
  currentIndex, totalEstudiantes, onPrevious, onNext, onBack, onStudentChange, estudiantes,
  canEditMateria, onSaveCalificacion, isReadOnly, selectedMateriaId, institucion,
}: BoletinIndividualProps) {
  const printContentRef = useRef<HTMLDivElement>(null);

  const editState = useSabanaEdit({
    estudiante, materias, canEditMateria, isReadOnly, onSaveCalificacion,
  });

  const isHT = sabanaData.metadatos.pais === 'HT';

  const nivelNombre = sabanaData.nivel?.nombre || '';
  const colorClaro = nivelNombre.includes('6to') ? '#fef2f2' :
                     nivelNombre.includes('5to') ? '#f0fdf4' : '#eff6ff';

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
            @page { size: 35.56cm 21.59cm; margin: 0; }
            .boletin-page { page-break-after: always; border: none !important; width: 35.56cm !important; }
            @media print {
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .boletin-page { page-break-after: always; border: none !important; width: 35.56cm !important; }
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

  // Grade header computation
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
    <>
      {/* CONTROLES (No se imprimen) */}
      <div className="no-print p-4 bg-white border-b flex items-center justify-between sticky top-0 z-50">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a la lista
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={currentIndex === 0}>
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          <Select value={currentIndex.toString()} onValueChange={(val) => onStudentChange(parseInt(val))}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{estudiantes.map((est, idx) => (
              <SelectItem key={est.id} value={idx.toString()}>
                {idx + 1}. {est.apellido.toUpperCase()} {est.segundoApellido ? est.segundoApellido.toUpperCase() : ''}, {est.nombre} {est.segundoNombre || ''}
              </SelectItem>
            ))}</SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={onNext} disabled={currentIndex === totalEstudiantes - 1}>
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button variant="default" size="sm" onClick={handlePrint} className="bg-blue-900 hover:bg-black">
          <Printer className="w-4 h-4 mr-2" />
          IMPRIMIR BOLETÍN
        </Button>
      </div>

      {/* Instrucciones */}
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

      {/* BOLETÍN PARA IMPRESIÓN */}
      <div ref={printContentRef} className="print-content p-4">
        {/* LADO A: CALIFICACIONES */}
        <div
          className="boletin-page bg-white relative mx-auto"
          style={{
            width: '38cm', maxWidth: '38cm', minHeight: '21.59cm',
            padding: '0.8cm', boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif', fontSize: '10px',
            border: '1px solid #ccc', marginBottom: '20px', pageBreakAfter: 'always',
          }}
        >
          <div>
            <div style={{
              backgroundColor: 'black', color: 'white', textAlign: 'center',
              padding: '7px 15px', fontWeight: 'bold', fontSize: '13px',
              letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '40px',
            }}>
              CALIFICACIONES DE RENDIMIENTO
            </div>

            {/* Grade Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '10px', marginBottom: '0' }}>
              <div style={{
                border: '2px solid black', padding: '4px 8px',
                fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap', lineHeight: '1.3',
              }}>
                Nombres y Apellidos
              </div>
              <div style={{
                flex: 1, borderBottom: '2px solid black',
                paddingBottom: '2px', paddingLeft: '8px', fontSize: '14px', fontWeight: 'bold',
              }}>
                {estudiante.nombre} {estudiante.segundoNombre ? estudiante.segundoNombre + ' ' : ''}{estudiante.apellido} {estudiante.segundoApellido || ''}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                {gn > 0 && (
                  <div style={{
                    position: 'relative', zIndex: 1, lineHeight: '1',
                    paddingLeft: '6px', paddingRight: '2px',
                    display: 'flex', alignItems: 'flex-end', marginRight: '-10px',
                  }}>
                    <span style={{
                      fontSize: '100px', fontWeight: '900', color: gradoColor,
                      lineHeight: '0.20', textShadow: `3px 3px 6px ${gradoSombra}`,
                    }}>
                      {gn}
                    </span>
                    <sup style={{
                      fontSize: '30px', fontWeight: 'bold', color: gradoColor,
                      position: 'absolute', right: '-34px', bottom: '10px', marginTop: '-10px',
                      textShadow: `2px 2px 4px ${gradoSombra}`,
                    }}>
                      {sufijo}
                    </sup>
                  </div>
                )}
                <div style={{
                  backgroundColor: 'black', color: 'white',
                  padding: '8px 16px', fontWeight: 'bold', fontSize: '17px',
                  lineHeight: '1', display: 'flex', alignItems: 'center', letterSpacing: '2px',
                }}>
                  GRADO
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '9px', marginBottom: '8px', lineHeight: '1.5' }}>
              <p style={{ margin: 0 }}>
                {gn >= 1 && gn <= 3 ? 'Primer Ciclo' : 'Segundo Ciclo'}
              </p>
              <p style={{ margin: 0 }}>
                {getFormatoSabana(sabanaData.sistemaEducativo) === 'primaria' ? 'Nivel Primario' :
                 getFormatoSabana(sabanaData.sistemaEducativo) === 'inicial' ? 'Nivel Inicial' : 'Nivel Secundario'}
              </p>
            </div>

            <SabanaTable
              estudiante={estudiante} materias={materias} editState={editState}
              canEditMateria={canEditMateria} isReadOnly={isReadOnly}
              selectedMateriaId={selectedMateriaId} isHT={isHT} colorClaro={colorClaro}
            />

            {getFormatoSabana(sabanaData.sistemaEducativo) === 'politecnico' && (
              <SabanaModulosTecnicos
                estudiante={estudiante} materias={materias} editState={editState}
                canEditMateria={canEditMateria} isReadOnly={isReadOnly}
                selectedMateriaId={selectedMateriaId} colorClaro={colorClaro}
              />
            )}

            <SabanaSummary estudiante={estudiante} materias={materias} isHT={isHT} />
          </div>
        </div>

        {/* LADO B: INFORMACIÓN Y FIRMAS */}
        <BoletinLadoB
          estudiante={estudiante} materias={materias} sabanaData={sabanaData}
          isReadOnly={isReadOnly} isHT={isHT} institucion={institucion}
        />
      </div>

      <style jsx global>{`
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
