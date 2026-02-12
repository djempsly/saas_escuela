'use client';

import { useMemo } from 'react';
import type { Estudiante, Materia, SabanaEditState, Calificacion } from '../types';
import { RAS_DISPLAY, RA_SUBCOLS, TOTAL_MODULO_ROWS } from '../constants';
import { calcularSituacion } from '../utils';
import { SabanaCell } from './SabanaCell';

interface SabanaModulosTecnicosProps {
  estudiante: Estudiante;
  materias: Materia[];
  editState: SabanaEditState;
  canEditMateria: (materiaId: string, cal: Calificacion | undefined) => boolean;
  isReadOnly: boolean;
  selectedMateriaId?: string;
  colorClaro: string;
}

export function SabanaModulosTecnicos({
  estudiante, materias, editState, canEditMateria, isReadOnly, selectedMateriaId, colorClaro,
}: SabanaModulosTecnicosProps) {
  const modulosTecnicos = useMemo(() => materias.filter(m => m.tipo === 'TECNICA'), [materias]);

  return (
    <>
      <div style={{
        backgroundColor: '#f5f1e1', color: 'black', padding: '4px 8px',
        fontWeight: 'bold', fontSize: '14px', marginBottom: '3px',
        border: '1px solid black', textAlign: 'center',
      }}>
        BLOQUE DE LOS MÓDULOS FORMATIVOS
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', marginBottom: '10px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid black', padding: '4px', width: '14%', textAlign: 'left', fontSize: '10px', backgroundColor: '#fef3c7', color: 'black' }}>
              Periodo de Aprobación
            </th>
            {RAS_DISPLAY.map((ra) => (
              <th key={`empty-${ra}`} colSpan={3} style={{ border: '1px solid black', padding: '2px' }}></th>
            ))}
            <th rowSpan={3} style={{ border: '1px solid black', padding: '2px', width: '2.5%', backgroundColor: '#fbbf24', color: 'black', verticalAlign: 'middle' }}>
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: '10px', fontWeight: 'bold', margin: '0 auto' }}>
                CALIFICACIÓN FINAL
              </div>
            </th>
            <th rowSpan={3} style={{ border: '1px solid black', padding: '2px', width: '2.5%', backgroundColor: '#e5e7eb', color: 'black', verticalAlign: 'middle' }}>
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', fontSize: '6px', fontWeight: 'bold', margin: '0 auto' }}>
                EVALUACIÓN ESPECIAL
              </div>
            </th>
            <th rowSpan={3} style={{ border: '1px solid black', padding: '3px', width: '6%', textAlign: 'center', backgroundColor: '#fbbf24', color: 'black', fontSize: '6px', fontWeight: 'bold', verticalAlign: 'middle' }}>
              SITUACIÓN FINAL DE MÓDULO FORMATIVO
            </th>
          </tr>
          <tr style={{ backgroundColor: '#fef3c7', color: 'black' }}>
            <th rowSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontSize: '7px', verticalAlign: 'middle' }}>
              MÓDULOS FORMATIVOS
            </th>
            {RAS_DISPLAY.map((ra) => (
              <th key={ra} colSpan={3} style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontSize: '10px' }}>RA</th>
            ))}
          </tr>
          <tr style={{ backgroundColor: colorClaro }}>
            {RAS_DISPLAY.flatMap((ra) =>
              RA_SUBCOLS.map((subcol) => (
                <th key={`${ra}${subcol.key}`} style={{
                  border: '1px solid black', padding: '1px', fontSize: '5px', minWidth: '14px',
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
                  border: '1px solid black', padding: '4px', fontWeight: 'bold', fontSize: '7px',
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
                {RAS_DISPLAY.flatMap((ra) =>
                  RA_SUBCOLS.map((subcol) => {
                    const raKey = `${ra}${subcol.key}`;
                    const valor = cal?.ras?.[raKey] || 0;
                    const cellId = modulo ? `modulo-${modulo.id}-${raKey}` : `empty-${rowIdx}-${raKey}`;

                    return (
                      <SabanaCell
                        key={cellId}
                        cellId={cellId}
                        valor={valor}
                        canEdit={!!modulo && canEdit}
                        isReadOnly={isReadOnly}
                        isEditing={editState.editingCell === cellId}
                        isSaving={editState.isSaving}
                        tempValue={editState.tempValue}
                        claseId={cal?.claseId || null}
                        periodo={raKey}
                        onCellClick={editState.handleCellClick}
                        onTempValueChange={editState.setTempValue}
                        onCellBlur={editState.handleCellBlur}
                        onCellKeyDown={editState.handleCellKeyDown}
                        bgColor={editState.editingCell === cellId ? '#fef9c3' : (subcol.key !== '' ? '#f3f4f6' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent'))}
                        fontSize="7px"
                        minWidth="14px"
                      />
                    );
                  })
                )}
                <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fef3c7', fontSize: '8px', color: cf > 0 && cf < 70 ? '#dc2626' : 'inherit' }}>
                  {modulo ? (cf || '-') : ''}
                </td>
                <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', backgroundColor: '#e5e7eb', fontSize: '8px' }}>
                  {modulo ? '-' : ''}
                </td>
                <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: 'bold', backgroundColor: situacion === 'A' ? '#dcfce7' : situacion === 'R' ? '#fee2e2' : '#f3f4f6', fontSize: '8px' }}>
                  {modulo ? situacion : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
