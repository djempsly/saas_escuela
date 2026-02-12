'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { Estudiante, Materia, Calificacion, EditableCell, SabanaEditState } from '../types';
import { ASIGNATURAS_GENERALES_MINERD, COMPETENCIAS, PERIODOS, RAS_DISPLAY, RA_SUBCOLS } from '../constants';
import { findMateriaByAsignatura } from '../utils';

interface UseSabanaEditParams {
  estudiante: Estudiante;
  materias: Materia[];
  canEditMateria: (materiaId: string, cal: Calificacion | undefined) => boolean;
  isReadOnly: boolean;
  onSaveCalificacion: (claseId: string, estudianteId: string, periodo: string, valor: number | null, competenciaId?: string) => Promise<void>;
}

export function useSabanaEdit({ estudiante, materias, canEditMateria, isReadOnly, onSaveCalificacion }: UseSabanaEditParams): SabanaEditState {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const modulosTecnicos = useMemo(() => materias.filter(m => m.tipo === 'TECNICA'), [materias]);

  const editableCells = useMemo(() => {
    const cells: EditableCell[] = [];

    ASIGNATURAS_GENERALES_MINERD.forEach((asignatura, asigIdx) => {
      const materia = findMateriaByAsignatura(materias, asignatura);
      const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
      const canEdit = materia ? canEditMateria(materia.id, cal) : false;

      if (canEdit && !isReadOnly) {
        COMPETENCIAS.forEach((comp, compIdx) => {
          PERIODOS.forEach((p, perIdx) => {
            cells.push({
              cellId: `${asignatura.codigo}-${comp.id}-${p}`,
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

    modulosTecnicos.forEach((modulo, modIdx) => {
      const cal = estudiante.calificaciones[modulo.id];
      const canEdit = canEditMateria(modulo.id, cal);

      if (canEdit && !isReadOnly) {
        RAS_DISPLAY.forEach((ra, raIdx) => {
          RA_SUBCOLS.forEach((subcol, subIdx) => {
            const raKey = `${ra}${subcol.key}`;
            cells.push({
              cellId: `modulo-${modulo.id}-${raKey}`,
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
  }, [materias, estudiante.calificaciones, canEditMateria, isReadOnly, modulosTecnicos]);

  const findNextCell = useCallback((currentCellId: string, reverse: boolean = false) => {
    const currentIdx = editableCells.findIndex(c => c.cellId === currentCellId);
    if (currentIdx === -1) return null;
    const nextIdx = reverse
      ? (currentIdx > 0 ? currentIdx - 1 : editableCells.length - 1)
      : (currentIdx < editableCells.length - 1 ? currentIdx + 1 : 0);
    return editableCells[nextIdx];
  }, [editableCells]);

  const handleCellClick = useCallback((cellId: string, currentValue: number | null, canEdit: boolean) => {
    if (!canEdit || isReadOnly || isSaving) return;
    setEditingCell(cellId);
    setTempValue(currentValue !== null && currentValue !== 0 ? currentValue.toString() : '');
  }, [isReadOnly, isSaving]);

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
      const asignatura = ASIGNATURAS_GENERALES_MINERD[nextCell.asignaturaIndex];
      const competencia = COMPETENCIAS[nextCell.competenciaIndex];
      if (asignatura && competencia) {
        const materia = findMateriaByAsignatura(materias, asignatura);
        const cal = materia ? estudiante.calificaciones[materia.id] : undefined;
        const compData = cal?.competencias?.[competencia.id];
        const value = compData?.[nextCell.periodo as keyof typeof compData];
        return typeof value === 'number' && value !== 0 ? value : null;
      }
    }
    return null;
  }, [estudiante.calificaciones, materias, modulosTecnicos]);

  const saveAndCloseCell = useCallback(async (
    claseId: string | null, periodo: string, cellId: string, moveToNext?: EditableCell | null,
  ) => {
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

    let compId: string | undefined = undefined;
    const isCpcOrCpex = cellId.endsWith('-cpc_nota') || cellId.endsWith('-cpex_nota');
    if (!cellId.startsWith('modulo-') && !isCpcOrCpex) {
      const parts = cellId.split('-');
      if (parts.length >= 2) compId = parts[1];
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

  const handleCellBlur = useCallback((claseId: string | null, periodo: string, cellId: string) => {
    if (!isSaving) {
      saveAndCloseCell(claseId, periodo, cellId);
    }
  }, [isSaving, saveAndCloseCell]);

  const handleCellKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>, claseId: string | null, periodo: string, currentCellId: string,
  ) => {
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

  return {
    editingCell, tempValue, isSaving,
    handleCellClick, handleCellBlur, handleCellKeyDown, setTempValue,
  };
}
