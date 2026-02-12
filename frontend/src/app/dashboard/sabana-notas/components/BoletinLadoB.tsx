'use client';

import type { Estudiante, Materia, SabanaData, InstitucionInfo } from '../types';
import { ASIGNATURAS_GENERALES_MINERD } from '../constants';
import { calcularCF, findMateriaByAsignatura } from '../utils';
import { SabanaObservaciones } from './SabanaObservaciones';
import { BoletinPortada } from './BoletinPortada';

interface BoletinLadoBProps {
  estudiante: Estudiante;
  materias: Materia[];
  sabanaData: SabanaData;
  isReadOnly: boolean;
  isHT: boolean;
  institucion?: InstitucionInfo | null;
}

export function BoletinLadoB({ estudiante, materias, sabanaData, isReadOnly, isHT, institucion }: BoletinLadoBProps) {
  return (
    <div
      className="boletin-page bg-white relative mx-auto"
      style={{
        width: '38cm', height: '21.59cm', padding: '1cm',
        boxSizing: 'border-box', fontFamily: 'Arial, sans-serif',
        fontSize: '11px', border: '1px solid #ccc',
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
          <SituacionFinalSection estudiante={estudiante} materias={materias} isHT={isHT} />

          {/* 3. OBSERVACIONES */}
          <SabanaObservaciones estudiante={estudiante} isReadOnly={isReadOnly} />

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
        <BoletinPortada estudiante={estudiante} sabanaData={sabanaData} institucion={institucion} />
      </div>
    </div>
  );
}

/* Situación Final del Estudiante section */
function SituacionFinalSection({ estudiante, materias, isHT }: {
  estudiante: Estudiante;
  materias: Materia[];
  isHT: boolean;
}) {
  const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
    const m = findMateriaByAsignatura(materias, a);
    return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
  }).filter((cf: number) => cf > 0);
  const prom = cfs.length > 0 ? cfs.reduce((acc, val) => acc + val, 0) / cfs.length : 0;
  const esPromovido = prom >= 70;
  const esReprobado = prom > 0 && prom < 70;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        backgroundColor: '#2d3a2e', color: 'white', textAlign: 'center',
        padding: '6px 10px', fontWeight: 'bold', fontSize: '10px',
        textTransform: 'uppercase' as const, letterSpacing: '1px',
      }}>
        SITUACIÓN FINAL DEL ESTUDIANTE
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
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
      </div>
    </div>
  );
}
