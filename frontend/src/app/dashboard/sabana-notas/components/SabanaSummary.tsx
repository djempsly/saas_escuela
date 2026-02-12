'use client';

import { useMemo } from 'react';
import type { Estudiante, Materia } from '../types';
import { ASIGNATURAS_GENERALES_MINERD, COMPETENCIAS } from '../constants';
import { calcularCF, findMateriaByAsignatura } from '../utils';

interface SabanaSummaryProps {
  estudiante: Estudiante;
  materias: Materia[];
  isHT: boolean;
}

export function SabanaSummary({ estudiante, materias, isHT }: SabanaSummaryProps) {
  const { promedioGeneral, situacionFinal, situacionBg } = useMemo(() => {
    const cfs = ASIGNATURAS_GENERALES_MINERD.map(a => {
      const m = findMateriaByAsignatura(materias, a);
      return m ? calcularCF(estudiante.calificaciones[m.id], isHT) : 0;
    }).filter((cf: number) => cf > 0);

    const prom = cfs.length > 0 ? Math.round(cfs.reduce((acc, val) => acc + val, 0) / cfs.length) : 0;
    const sit = prom >= 70
      ? (isHT ? 'ADMIS' : 'APROBADO')
      : prom > 0
        ? (isHT ? 'ÉCHEC' : 'REPROBADO')
        : (isHT ? 'EN COURS' : 'PENDIENTE');
    const bg = prom >= 70 ? '#dcfce7' : prom > 0 ? '#fee2e2' : '#f3f4f6';

    return { promedioGeneral: prom > 0 ? prom : '-', situacionFinal: sit, situacionBg: bg };
  }, [estudiante.calificaciones, materias, isHT]);

  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '10px', marginBottom: '10px', fontSize: '8px',
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
          <strong>PROMEDIO GENERAL:</strong> {promedioGeneral}
        </div>
        <div style={{
          border: '1px solid black', padding: '5px', textAlign: 'center',
          backgroundColor: situacionBg, fontWeight: 'bold',
        }}>
          <strong>SITUACIÓN FINAL:</strong> {situacionFinal}
        </div>
      </div>

      <div style={{ fontSize: '6px', marginTop: '5px', borderTop: '1px solid #ccc', paddingTop: '5px' }}>
        <strong>{isHT ? 'Compétences:' : 'Competencias:'}</strong> {COMPETENCIAS.map(c => `${c.corto} = ${c.nombre}`).join(' | ')}
        <br />
        <strong>{isHT ? 'Légende:' : 'Leyenda:'}</strong> P = {isHT ? 'Période' : 'Período'} | RP = {isHT ? 'Récupération' : 'Recuperación'} | C.F. = {isHT ? 'Note Finale' : 'Calificación Final'} | %A.A. = % {isHT ? 'Présence' : 'Asistencia Acumulada'} | SIT. = {isHT ? 'Résultat' : 'Situación'}
      </div>
    </>
  );
}
