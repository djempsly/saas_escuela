'use client';

import React from 'react';

interface SabanaCellProps {
  cellId: string;
  valor: number;
  canEdit: boolean;
  isReadOnly: boolean;
  isEditing: boolean;
  isSaving: boolean;
  tempValue: string;
  claseId: string | null;
  periodo: string;
  onCellClick: (cellId: string, currentValue: number | null, canEdit: boolean) => void;
  onTempValueChange: (value: string) => void;
  onCellBlur: (claseId: string | null, periodo: string, cellId: string) => void;
  onCellKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, claseId: string | null, periodo: string, cellId: string) => void;
  bgColor?: string;
  fontSize?: string;
  minWidth?: string;
}

export function SabanaCell({
  cellId, valor, canEdit, isReadOnly, isEditing, isSaving, tempValue,
  claseId, periodo, onCellClick, onTempValueChange, onCellBlur, onCellKeyDown,
  bgColor, fontSize = '8px', minWidth = '22px',
}: SabanaCellProps) {
  const defaultBg = isEditing ? '#fef9c3' : (canEdit && !isReadOnly ? '#dbeafe' : 'transparent');

  return (
    <td
      style={{
        border: '1px solid black',
        padding: '1px',
        textAlign: 'center',
        fontSize,
        backgroundColor: bgColor || defaultBg,
        color: valor > 0 && valor < 70 ? '#dc2626' : 'inherit',
        fontWeight: valor > 0 && valor < 70 ? 'bold' : 'normal',
        cursor: canEdit && !isReadOnly ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
        minWidth,
        height: '22px',
      }}
      onClick={() => onCellClick(cellId, valor || null, canEdit)}
    >
      {isEditing ? (
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={tempValue}
          onChange={(e) => onTempValueChange(e.target.value)}
          onBlur={() => onCellBlur(claseId, periodo, cellId)}
          onKeyDown={(e) => onCellKeyDown(e, claseId, periodo, cellId)}
          autoFocus
          disabled={isSaving}
          style={{
            width: '100%',
            border: 'none',
            textAlign: 'center',
            fontSize,
            backgroundColor: '#fef9c3',
            outline: 'none',
            padding: '2px',
          }}
        />
      ) : (
        valor > 0 ? valor : '-'
      )}
    </td>
  );
}
