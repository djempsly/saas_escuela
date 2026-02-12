'use client';

import type { Estudiante, SabanaData, InstitucionInfo } from '../types';

interface BoletinPortadaProps {
  estudiante: Estudiante;
  sabanaData: SabanaData;
  institucion?: InstitucionInfo | null;
}

export function BoletinPortada({ estudiante, sabanaData, institucion }: BoletinPortadaProps) {
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
  const franjaColor = (savedColores && savedColores[String(gn)]) || defaultColores[gn] || '#1e3a8a';

  const defaultSombras: Record<number, string> = {
    1: '#1e40af', 2: '#166534', 3: '#6b21a8',
    4: '#991b1b', 5: '#c2410c', 6: '#0e7490',
  };
  const savedSombras = institucion?.sabanaColores?.sombras;
  const gradoSombra = (savedSombras && savedSombras[String(gn)]) || defaultSombras[gn] || '#000';

  const savedFranja = institucion?.sabanaColores?.franja;
  const franjaVerticalColor = (savedFranja && savedFranja[String(gn)]) || franjaColor;

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
      {/* Franja VERTICAL a la IZQUIERDA con nombre del centro y lema */}
      <div style={{
        backgroundColor: franjaVerticalColor,
        color: 'white',
        width: '80px',
        minWidth: '80px',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
            {institucion?.nombre || 'INSTITUCIÓN EDUCATIVA'}
          </span>
          {institucion?.lema && (
            <span style={{ fontSize: '27px', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
              {institucion.lema}
            </span>
          )}
        </div>
      </div>

      {/* Contenido principal de la columna derecha */}
      <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Logo MINERD */}
        <div style={{ marginBottom: '15px' }}>
          <img
            src="https://www.ministeriodeeducacion.gob.do/img/logo/logoMinerdHD.svg"
            alt="MINERD"
            style={{ width: '100px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties}
          />
        </div>

        {/* Instrucciones del ministerio */}
        <div style={{ fontSize: '10px', lineHeight: '1.6', marginBottom: '10px' }}>
          <p style={{ margin: 0 }}>Viceministerio de Servicios Técnicos y Pedagógicos</p>
          <p style={{ margin: 0 }}>Dirección de Educación Secundaria</p>
          <p style={{ margin: 0 }}>Departamento de la Modalidad de Educación Técnico Profesional</p>
        </div>

        {/* Boletín de Calificaciones */}
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '15px', marginBottom: '20px' }}>
          Boletín de Calificaciones
        </div>

        {/* Bloque GRADO */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '15px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
            {gn > 0 && (
              <div style={{
                position: 'relative', zIndex: 1, lineHeight: '1',
                paddingLeft: '6px', paddingRight: '2px',
                display: 'flex', alignItems: 'flex-end', marginRight: '-10px',
              }}>
                <span style={{
                  fontSize: '100px', fontWeight: '900', color: franjaColor,
                  lineHeight: '0.20', textShadow: `3px 3px 6px ${gradoSombra}`,
                }}>
                  {gn}
                </span>
                <sup style={{
                  fontSize: '30px', fontWeight: 'bold', color: franjaColor,
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

        {/* Modalidad */}
        <div style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '10px', marginTop: '30px' }}>
          MODALIDAD TÉCNICO PROFESIONAL
        </div>

        {/* Línea separadora */}
        <div style={{ width: '60%', borderBottom: '2px solid black', marginBottom: '20px' }}></div>

        {/* Año Escolar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '15px' }}>
          <div style={{
            backgroundColor: 'black', color: 'white',
            padding: '8px 16px', fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px',
          }}>
            AÑO ESCOLAR
          </div>
          <span style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '1px' }}>
            {sabanaData.cicloLectivo?.nombre || '________'}
          </span>
        </div>

        {/* Formulario oficial */}
        <div style={{ width: '90%', fontSize: '15px' }}>
          {/* Fila superior: SECCIÓN y NÚMERO DE ORDEN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
              <span style={{
                backgroundColor: '#2d3a2e', color: 'white', padding: '4px 8px',
                fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap',
              }}>SECCIÓN</span>
              <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '16px' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
              <span style={{
                backgroundColor: '#2d3a2e', color: 'white', padding: '4px 8px',
                fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap',
              }}>NÚMERO DE ORDEN</span>
              <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '16px' }}></div>
            </div>
          </div>

          {/* Campos verticales del formulario */}
          {[
            { label: 'NOMBRES', value: `${estudiante.nombre}${estudiante.segundoNombre ? ` ${estudiante.segundoNombre}` : ''}` },
            { label: 'APELLIDOS', value: `${estudiante.apellido}${estudiante.segundoApellido ? ` ${estudiante.segundoApellido}` : ''}` },
            { label: 'NOMBRE DEL CENTRO EDUCATIVO', value: institucion?.nombre || '' },
            { label: 'CÓDIGO DEL CENTRO', value: institucion?.codigoCentro || '' },
            { label: 'DIRECCIÓN DEL CENTRO EDUCATIVO', value: institucion?.direccion || '' },
            { label: 'DISTRITO EDUCATIVO', value: institucion?.distritoEducativo || '' },
            { label: 'DIRECCIÓN REGIONAL DE EDUCACIÓN', value: institucion?.regionalEducacion || '' },
          ].map((campo) => (
            <div key={campo.label} style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                backgroundColor: '#2d3a2e', color: 'white', padding: '4px 8px',
                fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' as const,
                whiteSpace: 'nowrap', minWidth: '70px', textAlign: 'center',
              }}>{campo.label}</span>
              <div style={{ flex: 1, borderBottom: '1px solid black', minHeight: '16px', fontSize: '15px', paddingBottom: '2px' }}>
                {campo.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
