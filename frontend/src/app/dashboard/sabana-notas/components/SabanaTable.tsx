'use client';

import { useCallback } from 'react';
import type { Estudiante, Materia, SabanaEditState, Calificacion } from '../types';
import { COMPETENCIAS, PERIODOS, ASIGNATURAS_GENERALES_MINERD } from '../constants';
import { calcularPromedioPeriodo, calcularCF, calcularSituacion, findMateriaByAsignatura } from '../utils';
import { SabanaCell } from './SabanaCell';

interface SabanaTableProps {
  estudiante: Estudiante;
  materias: Materia[];
  editState: SabanaEditState;
  canEditMateria: (materiaId: string, cal: Calificacion | undefined) => boolean;
  isReadOnly: boolean;
  selectedMateriaId?: string;
  isHT: boolean;
  colorClaro: string;
}

export function SabanaTable({
  estudiante, materias, editState, canEditMateria, isReadOnly, selectedMateriaId, isHT, colorClaro,
}: SabanaTableProps) {
  const findMateria = useCallback(
    (asignatura: { codigo: string; nombre: string }) => findMateriaByAsignatura(materias, asignatura),
    [materias],
  );

  return (
    <>
      <div style={{
        backgroundColor: '#fef3c7', color: 'black', padding: '4px 8px',
        fontWeight: 'bold', fontSize: '10px', marginBottom: '3px', border: '1px solid black',
      }}>
        {isHT ? 'MATIÈRES GÉNÉRALES' : 'ASIGNATURAS GENERALES (FORMACIÓN FUNDAMENTAL)'}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '8px' }}>
        <thead>
          <tr style={{ backgroundColor: '#fef3c7', color: 'black' }}>
            <th rowSpan={2} style={{ border: '1px solid black', padding: '3px', width: '12%', textAlign: 'left' }}>
              {isHT ? 'MATIÈRES' : 'ASIGNATURAS'}
            </th>
            {COMPETENCIAS.map(comp => (
              <th key={comp.id} colSpan={8} style={{ border: '1px solid black', padding: '1px', fontSize: '7px' }}>{comp.corto}</th>
            ))}
            <th colSpan={4} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', fontSize: '7px' }}>
              {isHT ? 'PÉRIODES' : 'PROM. PER.'}
            </th>
            <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', width: '2.5%' }}>{isHT ? 'MOY.' : 'C.F.'}</th>
            <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', width: '2.5%' }}>%A.A.</th>
            {isHT ? (
              <>
                <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#e5e7eb', color: 'black', width: '6%' }}>REPÊCHAGE</th>
                <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#d1d5db', color: 'black', width: '6%' }}>SESSION EXTRA</th>
              </>
            ) : (
              <>
                <th colSpan={4} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#e5e7eb', color: 'black', fontSize: '7px' }}>CALIFICACIÓN COMPLETIVA</th>
                <th colSpan={4} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#d1d5db', color: 'black', fontSize: '7px' }}>CALIFICACIÓN EXTRAORDINARIA</th>
                <th colSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#9ca3af', color: 'white', fontSize: '7px' }}>EVALUACIÓN ESPECIAL</th>
              </>
            )}
            <th rowSpan={2} style={{ border: '1px solid black', padding: '1px', backgroundColor: '#fbbf24', color: 'black', width: '2.5%' }}>{isHT ? 'RES.' : 'SIT.'}</th>
          </tr>
          <tr style={{ backgroundColor: colorClaro }}>
            {COMPETENCIAS.map(comp =>
              PERIODOS.map(p => (
                <th key={`${comp.id}-${p}`} style={{
                  border: '1px solid black', padding: '0px', fontSize: '6px',
                  backgroundColor: p.startsWith('RP') ? '#e5e7eb' : 'transparent', minWidth: '18px',
                }}>{p}</th>
              ))
            )}
            {['P1', 'P2', 'P3', 'P4'].map(p => (
              <th key={`prom-${p}`} style={{ border: '1px solid black', padding: '1px', fontSize: '6px', backgroundColor: '#fef3c7' }}>{p}</th>
            ))}
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
            const materia = findMateria(asignatura);
            const isSelectedMateria = materia && selectedMateriaId === materia.id;
            const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
            const canEdit = materia ? canEditMateria(materia.id, cal) : false;
            const cf = calcularCF(cal, isHT);
            const situacion = calcularSituacion(cf);

            return (
              <tr key={idx} style={{
                backgroundColor: isSelectedMateria ? '#fff7ed' : 'transparent',
                outline: isSelectedMateria ? '2px solid #f97316' : 'none',
                zIndex: isSelectedMateria ? 10 : 0, position: 'relative',
              }}>
                <td style={{
                  border: '1px solid black', padding: '2px', fontWeight: 'bold', textAlign: 'left', fontSize: '8px',
                  backgroundColor: isSelectedMateria ? '#ffedd5' : (canEdit && !isReadOnly ? '#e0f2fe' : 'transparent'),
                }}>
                  {asignatura.nombre}
                  {isSelectedMateria && <span style={{ color: '#f97316', fontSize: '7px' }}> (Seleccionada)</span>}
                  {!isSelectedMateria && canEdit && !isReadOnly && <span style={{ color: '#059669', fontSize: '7px' }}> (e)</span>}
                </td>
                {COMPETENCIAS.map(comp =>
                  PERIODOS.map(p => {
                    const pLower = p.toLowerCase() as 'p1' | 'rp1' | 'p2' | 'rp2' | 'p3' | 'rp3' | 'p4' | 'rp4';
                    const valor = cal?.competencias?.[comp.id]?.[pLower] || 0;
                    const cellId = `${asignatura.codigo}-${comp.id}-${p}`;
                    return (
                      <SabanaCell
                        key={cellId} cellId={cellId} valor={valor} canEdit={canEdit} isReadOnly={isReadOnly}
                        isEditing={editState.editingCell === cellId} isSaving={editState.isSaving}
                        tempValue={editState.tempValue} claseId={cal?.claseId || null} periodo={pLower}
                        onCellClick={editState.handleCellClick} onTempValueChange={editState.setTempValue}
                        onCellBlur={editState.handleCellBlur} onCellKeyDown={editState.handleCellKeyDown}
                        bgColor={editState.editingCell === cellId ? '#fef9c3' : (p.startsWith('RP') ? '#f3f4f6' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent'))}
                      />
                    );
                  })
                )}
                {/* Period averages */}
                {(['p1', 'p2', 'p3', 'p4'] as const).map(p => {
                  const rp = `r${p}` as 'rp1' | 'rp2' | 'rp3' | 'rp4';
                  return (
                    <td key={`avg-${p}`} style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '8px' }}>
                      {calcularPromedioPeriodo(cal, p, rp) || '-'}
                    </td>
                  );
                })}
                {/* C.F. */}
                <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '9px', color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit' }}>
                  {cf || '-'}
                </td>
                {/* %AA */}
                <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#fef3c7', fontSize: '8px' }}>-</td>
                {/* Country-specific columns */}
                {isHT ? (
                  <>
                    <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>{cal?.cc || '-'}</td>
                    <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#d1d5db', fontSize: '8px' }}>{cal?.cex || '-'}</td>
                  </>
                ) : (
                  <CompletivaExtraordinariaCells
                    asignaturaCodigo={asignatura.codigo} cal={cal} cf={cf} canEdit={canEdit}
                    isReadOnly={isReadOnly} editState={editState}
                  />
                )}
                {/* Situación */}
                <td style={{
                  border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', fontSize: '8px',
                  backgroundColor: situacion === 'A' ? '#dcfce7' : situacion === 'R' ? '#fee2e2' : '#f3f4f6',
                }}>
                  {situacion}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* Completiva + Extraordinaria + Evaluación Especial columns (RD only) */
function CompletivaExtraordinariaCells({
  asignaturaCodigo, cal, cf, canEdit, isReadOnly, editState,
}: {
  asignaturaCodigo: string;
  cal: Calificacion | undefined;
  cf: number;
  canEdit: boolean;
  isReadOnly: boolean;
  editState: SabanaEditState;
}) {
  const cpcNota = cal?.cpcNota ?? 0;
  const cpexNota = cal?.cpexNota ?? 0;
  const pcp50 = cf > 0 && cf < 70 ? Math.round(cf * 0.5) : 0;
  const cpc50 = cpcNota > 0 ? Math.round(cpcNota * 0.5) : 0;
  const ccCalc = cf > 0 && cf < 70 && cpcNota > 0 ? Math.round(cf * 0.5 + cpcNota * 0.5) : 0;
  const needsExtraordinaria = ccCalc > 0 && ccCalc < 70;
  const pcp30 = needsExtraordinaria ? Math.round(cf * 0.3) : 0;
  const cpex70Calc = needsExtraordinaria && cpexNota > 0 ? Math.round(cpexNota * 0.7) : 0;
  const cexCalc = needsExtraordinaria && cpexNota > 0 ? Math.round(cf * 0.3 + cpexNota * 0.7) : 0;
  const cpcCellId = `${asignaturaCodigo}-cpc_nota`;
  const cpexCellId = `${asignaturaCodigo}-cpex_nota`;
  const canEditCpc = canEdit && !isReadOnly && cf > 0 && cf < 70;
  const canEditCpex = canEdit && !isReadOnly && needsExtraordinaria;

  return (
    <>
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>{pcp50 > 0 ? pcp50 : '-'}</td>
      <SabanaCell cellId={cpcCellId} valor={cpcNota} canEdit={canEditCpc} isReadOnly={false}
        isEditing={editState.editingCell === cpcCellId} isSaving={editState.isSaving} tempValue={editState.tempValue}
        claseId={cal?.claseId || null} periodo="cpc_nota"
        onCellClick={editState.handleCellClick} onTempValueChange={editState.setTempValue}
        onCellBlur={editState.handleCellBlur} onCellKeyDown={editState.handleCellKeyDown}
        bgColor={editState.editingCell === cpcCellId ? '#fef9c3' : (canEditCpc ? '#dbeafe' : '#e5e7eb')}
      />
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>{cpc50 > 0 ? cpc50 : '-'}</td>
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#e5e7eb', fontSize: '8px' }}>{ccCalc > 0 ? ccCalc : '-'}</td>
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#d1d5db', fontSize: '8px' }}>{pcp30 > 0 ? pcp30 : '-'}</td>
      <SabanaCell cellId={cpexCellId} valor={cpexNota} canEdit={canEditCpex} isReadOnly={false}
        isEditing={editState.editingCell === cpexCellId} isSaving={editState.isSaving} tempValue={editState.tempValue}
        claseId={cal?.claseId || null} periodo="cpex_nota"
        onCellClick={editState.handleCellClick} onTempValueChange={editState.setTempValue}
        onCellBlur={editState.handleCellBlur} onCellKeyDown={editState.handleCellKeyDown}
        bgColor={editState.editingCell === cpexCellId ? '#fef9c3' : (canEditCpex ? '#dbeafe' : '#d1d5db')}
      />
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#d1d5db', fontSize: '8px' }}>{cpex70Calc > 0 ? cpex70Calc : '-'}</td>
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#d1d5db', fontSize: '8px' }}>{cexCalc > 0 ? cexCalc : '-'}</td>
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#9ca3af', color: 'white', fontSize: '8px' }}>-</td>
      <td style={{ border: '1px solid black', padding: '1px', textAlign: 'center', backgroundColor: '#9ca3af', color: 'white', fontSize: '8px' }}>-</td>
    </>
  );
}
