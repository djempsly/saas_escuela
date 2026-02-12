'use client';

import { useState, useEffect, useCallback } from 'react';
import { sabanaApi } from '@/lib/api';
import type { Estudiante } from '../types';

interface SabanaObservacionesProps {
  estudiante: Estudiante;
  isReadOnly: boolean;
}

export function SabanaObservaciones({ estudiante, isReadOnly }: SabanaObservacionesProps) {
  const getObservacionesData = useCallback(() => {
    for (const materiaId of Object.keys(estudiante.calificaciones || {})) {
      const cal = estudiante.calificaciones[materiaId];
      if (cal?.claseId && cal.observaciones) {
        return { texto: cal.observaciones, claseId: cal.claseId };
      }
    }
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

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        backgroundColor: '#2d3a2e', color: 'white', textAlign: 'center',
        padding: '6px 10px', fontWeight: 'bold', fontSize: '10px',
        textTransform: 'uppercase', letterSpacing: '1px',
      }}>
        OBSERVACIONES
      </div>
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
  );
}
