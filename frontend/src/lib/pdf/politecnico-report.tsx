import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Locale } from '../i18n';
import { getMediaUrl } from '../api';

// Tipos específicos para Politécnico
export interface CompetenciaCalificacion {
  codigo: string;
  nombre: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  rp1?: number;
  rp2?: number;
  rp3?: number;
  rp4?: number;
}

export interface ModuloTecnico {
  codigo: string;
  nombre: string;
  resultadosAprendizaje: ResultadoAprendizaje[];
}

export interface ResultadoAprendizaje {
  codigo: string;
  descripcion: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  rp1?: number;
  rp2?: number;
  rp3?: number;
  rp4?: number;
}

export interface PolitecnicoReportData {
  estudiante: {
    nombre: string;
    apellido: string;
    matricula: string;
    grado: string;
    seccion: string;
    foto?: string;
  };
  institucion: {
    nombre: string;
    logoUrl?: string;
    direccion?: string;
    telefono?: string;
    colorPrimario: string;
  };
  cicloLectivo: string;
  competencias: CompetenciaCalificacion[];
  modulosTecnicos: ModuloTecnico[];
  asistencia: {
    totalDias: number;
    diasPresente: number;
    porcentajeAnual: number;
  };
  evaluacionesExtendidas: {
    completiva1?: number;
    completiva2?: number;
    completiva3?: number;
    completiva4?: number;
    extraordinaria?: number;
    especial?: number;
  };
  observaciones: string;
  situacionFinal: 'PROMOVIDO' | 'REPROBADO' | 'APLAZANTE';
  fechaEmision: string;
}

export interface PolitecnicoConfig {
  locale: Locale;
  gradeColors: {
    [grado: string]: string;
  };
  colorNotas: {
    excelente: string;
    bueno: string;
    regular: string;
    deficiente: string;
  };
}

// Colores por defecto para grados
export const defaultGradeColors: Record<string, string> = {
  '4to': '#3b82f6', // Azul
  '5to': '#22c55e', // Verde
  '6to': '#ef4444', // Rojo
  'default': '#1a365d',
};

// Función para calcular promedio de período
const calcularPromedioPeriodo = (
  competencias: CompetenciaCalificacion[],
  periodo: 'p1' | 'p2' | 'p3' | 'p4',
  recuperacion: 'rp1' | 'rp2' | 'rp3' | 'rp4'
): number => {
  const notas = competencias.map((c) => {
    const notaPeriodo = c[periodo];
    const notaRecuperacion = c[recuperacion];
    // Si tiene recuperación y es mayor, usar esa
    if (notaRecuperacion && notaPeriodo && notaRecuperacion > notaPeriodo) {
      return Math.min(notaRecuperacion, 70); // Máximo 70 en recuperación
    }
    return notaPeriodo || 0;
  });
  const suma = notas.reduce((a, b) => a + b, 0);
  return notas.length > 0 ? suma / notas.length : 0;
};

// Función para obtener color de nota
const getNotaColor = (nota: number | undefined, config: PolitecnicoConfig): string => {
  if (!nota) return '#666';
  if (nota >= 90) return config.colorNotas.excelente;
  if (nota >= 80) return config.colorNotas.bueno;
  if (nota >= 70) return config.colorNotas.regular;
  return config.colorNotas.deficiente;
};

// Función para obtener color del grado
const getGradoColor = (grado: string, config: PolitecnicoConfig): string => {
  const gradoLower = grado.toLowerCase();
  for (const [key, color] of Object.entries(config.gradeColors)) {
    if (gradoLower.includes(key.toLowerCase())) {
      return color;
    }
  }
  return config.gradeColors['default'] || defaultGradeColors['default'];
};

export const PolitecnicoReportDocument: React.FC<{
  data: PolitecnicoReportData;
  config: PolitecnicoConfig;
}> = ({ data, config }) => {
  const { estudiante, institucion, competencias, modulosTecnicos, asistencia, evaluacionesExtendidas, situacionFinal } = data;
  const gradoColor = getGradoColor(estudiante.grado, config);

  // Calcular promedios por período
  const promedioP1 = calcularPromedioPeriodo(competencias, 'p1', 'rp1');
  const promedioP2 = calcularPromedioPeriodo(competencias, 'p2', 'rp2');
  const promedioP3 = calcularPromedioPeriodo(competencias, 'p3', 'rp3');
  const promedioP4 = calcularPromedioPeriodo(competencias, 'p4', 'rp4');
  const calificacionFinal = (promedioP1 + promedioP2 + promedioP3 + promedioP4) / 4;

  // Tamaño Legal en puntos (8.5" x 14")
  const LEGAL_WIDTH = 612;
  const LEGAL_HEIGHT = 1008;

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 8,
      fontFamily: 'Helvetica',
    },
    header: {
      flexDirection: 'row',
      marginBottom: 15,
      borderBottom: `2px solid ${gradoColor}`,
      paddingBottom: 10,
    },
    logo: {
      width: 50,
      height: 50,
      marginRight: 10,
    },
    headerInfo: {
      flex: 1,
    },
    institutionName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: gradoColor,
    },
    title: {
      fontSize: 12,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 10,
      color: gradoColor,
      textTransform: 'uppercase',
    },
    studentInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
      padding: 8,
      backgroundColor: '#f8fafc',
      borderRadius: 4,
    },
    infoRow: {
      flexDirection: 'row',
      gap: 4,
    },
    label: {
      fontWeight: 'bold',
      color: '#374151',
    },
    value: {
      color: '#6b7280',
    },
    section: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 9,
      fontWeight: 'bold',
      backgroundColor: gradoColor,
      color: 'white',
      padding: 5,
      marginBottom: 5,
    },
    table: {
      borderWidth: 1,
      borderColor: '#d1d5db',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: gradoColor,
    },
    tableHeaderCell: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 6,
      padding: 3,
      textAlign: 'center',
      borderRightWidth: 1,
      borderRightColor: 'rgba(255,255,255,0.3)',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    tableRowAlt: {
      backgroundColor: '#f9fafb',
    },
    tableCell: {
      fontSize: 6,
      padding: 3,
      textAlign: 'center',
      borderRightWidth: 1,
      borderRightColor: '#e5e7eb',
    },
    tableCellCompetencia: {
      width: '20%',
      textAlign: 'left',
      fontSize: 6,
    },
    tableCellNota: {
      width: '6.25%',
    },
    tableCellPromedio: {
      width: '10%',
      fontWeight: 'bold',
    },
    notaCell: {
      fontWeight: 'bold',
    },
    promediosRow: {
      flexDirection: 'row',
      backgroundColor: `${gradoColor}15`,
      borderTopWidth: 2,
      borderTopColor: gradoColor,
    },
    situacionBox: {
      marginTop: 15,
      padding: 12,
      borderRadius: 5,
      textAlign: 'center',
      borderWidth: 2,
    },
    promovido: {
      backgroundColor: '#dcfce7',
      borderColor: '#22c55e',
    },
    reprobado: {
      backgroundColor: '#fee2e2',
      borderColor: '#ef4444',
    },
    aplazante: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
    },
    situacionText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 30,
      right: 30,
    },
    firmasContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 30,
    },
    firmaBox: {
      width: '30%',
      textAlign: 'center',
    },
    firmaLine: {
      borderTopWidth: 1,
      borderTopColor: '#374151',
      marginTop: 40,
      paddingTop: 5,
      fontSize: 7,
    },
    observacionesBox: {
      marginTop: 15,
      padding: 10,
      backgroundColor: '#fffbeb',
      borderRadius: 4,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    pageNumber: {
      position: 'absolute',
      bottom: 15,
      right: 30,
      fontSize: 7,
      color: '#9ca3af',
    },
    asistenciaBox: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 8,
      backgroundColor: '#f0f9ff',
      borderRadius: 4,
      marginBottom: 10,
    },
    asistenciaItem: {
      textAlign: 'center',
    },
    asistenciaValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: gradoColor,
    },
    asistenciaLabel: {
      fontSize: 6,
      color: '#6b7280',
    },
    evaluacionesExtendidas: {
      marginTop: 10,
    },
    evaluacionesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 5,
      backgroundColor: '#fef3c7',
      borderRadius: 4,
    },
    evaluacionItem: {
      textAlign: 'center',
      width: '16%',
    },
  });

  // Componente para celda de nota con color
  const NotaCell = ({ valor, width = '6.25%' }: { valor?: number; width?: string }) => (
    <View style={[styles.tableCell, { width }]}>
      <Text style={[styles.notaCell, { color: getNotaColor(valor, config) }]}>
        {valor !== undefined && valor !== null ? valor.toFixed(0) : '-'}
      </Text>
    </View>
  );

  return (
    <Document>
      {/* PÁGINA 1: Información General, Observaciones, Situación Final */}
      <Page size={[LEGAL_WIDTH, LEGAL_HEIGHT]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {institucion.logoUrl && (
            <Image src={getMediaUrl(institucion.logoUrl)} style={styles.logo} />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.institutionName}>{institucion.nombre}</Text>
            <Text style={{ fontSize: 7, color: '#6b7280' }}>{institucion.direccion}</Text>
            <Text style={{ fontSize: 7, color: '#6b7280' }}>Tel: {institucion.telefono}</Text>
          </View>
          <View style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 8, fontWeight: 'bold' }}>BOLETÍN DE CALIFICACIONES</Text>
            <Text style={{ fontSize: 7, color: '#6b7280' }}>Año Escolar: {data.cicloLectivo}</Text>
            <Text style={{ fontSize: 7, color: '#6b7280' }}>Fecha: {data.fechaEmision}</Text>
          </View>
        </View>

        <Text style={styles.title}>Información del Estudiante - Politécnico</Text>

        {/* Información del Estudiante */}
        <View style={styles.studentInfo}>
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nombre: </Text>
              <Text style={styles.value}>{estudiante.nombre} {estudiante.apellido}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Matrícula: </Text>
              <Text style={styles.value}>{estudiante.matricula}</Text>
            </View>
          </View>
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Grado: </Text>
              <Text style={[styles.value, { color: gradoColor, fontWeight: 'bold' }]}>
                {estudiante.grado}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Sección: </Text>
              <Text style={styles.value}>{estudiante.seccion}</Text>
            </View>
          </View>
        </View>

        {/* Asistencia Anual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ASISTENCIA ANUAL</Text>
          <View style={styles.asistenciaBox}>
            <View style={styles.asistenciaItem}>
              <Text style={styles.asistenciaValue}>{asistencia.totalDias}</Text>
              <Text style={styles.asistenciaLabel}>Días Totales</Text>
            </View>
            <View style={styles.asistenciaItem}>
              <Text style={styles.asistenciaValue}>{asistencia.diasPresente}</Text>
              <Text style={styles.asistenciaLabel}>Días Presente</Text>
            </View>
            <View style={styles.asistenciaItem}>
              <Text style={[styles.asistenciaValue, { color: asistencia.porcentajeAnual >= 80 ? '#22c55e' : '#ef4444' }]}>
                {asistencia.porcentajeAnual.toFixed(1)}%
              </Text>
              <Text style={styles.asistenciaLabel}>AA% (Asistencia Anual)</Text>
            </View>
          </View>
        </View>

        {/* Resumen de Calificaciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RESUMEN DE CALIFICACIONES POR PERÍODO</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 10, backgroundColor: '#f8fafc', borderRadius: 4 }}>
            <View style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: getNotaColor(promedioP1, config) }}>
                {promedioP1.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 7, color: '#6b7280' }}>Prom. P1</Text>
            </View>
            <View style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: getNotaColor(promedioP2, config) }}>
                {promedioP2.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 7, color: '#6b7280' }}>Prom. P2</Text>
            </View>
            <View style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: getNotaColor(promedioP3, config) }}>
                {promedioP3.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 7, color: '#6b7280' }}>Prom. P3</Text>
            </View>
            <View style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: getNotaColor(promedioP4, config) }}>
                {promedioP4.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 7, color: '#6b7280' }}>Prom. P4</Text>
            </View>
            <View style={{ textAlign: 'center', backgroundColor: gradoColor, padding: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                {calificacionFinal.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 7, color: 'white' }}>CF (Final)</Text>
            </View>
          </View>
        </View>

        {/* Evaluaciones de Recuperación Extendida */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EVALUACIONES DE RECUPERACIÓN EXTENDIDA</Text>
          <View style={styles.evaluacionesRow}>
            <View style={styles.evaluacionItem}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                {evaluacionesExtendidas.completiva1 ?? '-'}
              </Text>
              <Text style={{ fontSize: 6 }}>Completiva 1</Text>
            </View>
            <View style={styles.evaluacionItem}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                {evaluacionesExtendidas.completiva2 ?? '-'}
              </Text>
              <Text style={{ fontSize: 6 }}>Completiva 2</Text>
            </View>
            <View style={styles.evaluacionItem}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                {evaluacionesExtendidas.completiva3 ?? '-'}
              </Text>
              <Text style={{ fontSize: 6 }}>Completiva 3</Text>
            </View>
            <View style={styles.evaluacionItem}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                {evaluacionesExtendidas.completiva4 ?? '-'}
              </Text>
              <Text style={{ fontSize: 6 }}>Completiva 4</Text>
            </View>
            <View style={styles.evaluacionItem}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                {evaluacionesExtendidas.extraordinaria ?? '-'}
              </Text>
              <Text style={{ fontSize: 6 }}>Extraordinaria</Text>
            </View>
            <View style={styles.evaluacionItem}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                {evaluacionesExtendidas.especial ?? '-'}
              </Text>
              <Text style={{ fontSize: 6 }}>Especial</Text>
            </View>
          </View>
        </View>

        {/* Observaciones */}
        {data.observaciones && (
          <View style={styles.observacionesBox}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Observaciones:</Text>
            <Text>{data.observaciones}</Text>
          </View>
        )}

        {/* Situación Final */}
        <View
          style={[
            styles.situacionBox,
            situacionFinal === 'PROMOVIDO'
              ? styles.promovido
              : situacionFinal === 'REPROBADO'
              ? styles.reprobado
              : styles.aplazante,
          ]}
        >
          <Text style={styles.situacionText}>
            SITUACIÓN FINAL: {situacionFinal}
          </Text>
          <Text style={{ fontSize: 8, marginTop: 5 }}>
            Calificación Final: {calificacionFinal.toFixed(2)} | Asistencia: {asistencia.porcentajeAnual.toFixed(1)}%
          </Text>
        </View>

        {/* Firmas */}
        <View style={styles.firmasContainer}>
          <View style={styles.firmaBox}>
            <Text style={styles.firmaLine}>Director(a)</Text>
          </View>
          <View style={styles.firmaBox}>
            <Text style={styles.firmaLine}>Docente</Text>
          </View>
          <View style={styles.firmaBox}>
            <Text style={styles.firmaLine}>Padre/Madre/Tutor</Text>
          </View>
        </View>

        <Text style={styles.pageNumber}>Página 1 de 2</Text>
      </Page>

      {/* PÁGINA 2: Sábana de Calificaciones Detallada */}
      <Page size={[LEGAL_WIDTH, LEGAL_HEIGHT]} style={styles.page} orientation="landscape">
        {/* Header compacto */}
        <View style={[styles.header, { marginBottom: 8 }]}>
          <View style={styles.headerInfo}>
            <Text style={[styles.institutionName, { fontSize: 10 }]}>{institucion.nombre}</Text>
            <Text style={{ fontSize: 6, color: '#6b7280' }}>
              {estudiante.nombre} {estudiante.apellido} | {estudiante.grado} - {estudiante.seccion} | {data.cicloLectivo}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { fontSize: 10, marginVertical: 5 }]}>
          SÁBANA DE CALIFICACIONES - EVALUACIÓN POR COMPETENCIAS
        </Text>

        {/* Tabla de Competencias Específicas */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: 7 }]}>COMPETENCIAS ESPECÍFICAS (5)</Text>
          <View style={styles.table}>
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableCellCompetencia]}>COMPETENCIA</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P1</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP1</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P2</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP2</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P3</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP3</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P4</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP4</Text>
              <Text style={[styles.tableHeaderCell, styles.tableCellPromedio]}>PROM</Text>
            </View>

            {/* Filas de competencias */}
            {competencias.map((comp, idx) => {
              const promComp = (
                (comp.p1 || 0) + (comp.p2 || 0) + (comp.p3 || 0) + (comp.p4 || 0)
              ) / 4;
              return (
                <View key={comp.codigo} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <View style={[styles.tableCell, styles.tableCellCompetencia]}>
                    <Text style={{ fontWeight: 'bold' }}>{comp.codigo}</Text>
                    <Text style={{ fontSize: 5 }}>{comp.nombre}</Text>
                  </View>
                  <NotaCell valor={comp.p1} />
                  <NotaCell valor={comp.rp1} />
                  <NotaCell valor={comp.p2} />
                  <NotaCell valor={comp.rp2} />
                  <NotaCell valor={comp.p3} />
                  <NotaCell valor={comp.rp3} />
                  <NotaCell valor={comp.p4} />
                  <NotaCell valor={comp.rp4} />
                  <View style={[styles.tableCell, styles.tableCellPromedio]}>
                    <Text style={[styles.notaCell, { color: getNotaColor(promComp, config) }]}>
                      {promComp.toFixed(1)}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Fila de promedios */}
            <View style={styles.promediosRow}>
              <View style={[styles.tableCell, styles.tableCellCompetencia]}>
                <Text style={{ fontWeight: 'bold' }}>PROMEDIO POR PERÍODO</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellNota]}>
                <Text style={[styles.notaCell, { color: getNotaColor(promedioP1, config) }]}>
                  {promedioP1.toFixed(1)}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellNota]}><Text>-</Text></View>
              <View style={[styles.tableCell, styles.tableCellNota]}>
                <Text style={[styles.notaCell, { color: getNotaColor(promedioP2, config) }]}>
                  {promedioP2.toFixed(1)}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellNota]}><Text>-</Text></View>
              <View style={[styles.tableCell, styles.tableCellNota]}>
                <Text style={[styles.notaCell, { color: getNotaColor(promedioP3, config) }]}>
                  {promedioP3.toFixed(1)}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellNota]}><Text>-</Text></View>
              <View style={[styles.tableCell, styles.tableCellNota]}>
                <Text style={[styles.notaCell, { color: getNotaColor(promedioP4, config) }]}>
                  {promedioP4.toFixed(1)}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellNota]}><Text>-</Text></View>
              <View style={[styles.tableCell, styles.tableCellPromedio, { backgroundColor: gradoColor }]}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  CF: {calificacionFinal.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Módulos Técnicos */}
        {modulosTecnicos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { fontSize: 7 }]}>MÓDULOS TÉCNICOS - RESULTADOS DE APRENDIZAJE (RA)</Text>
            {modulosTecnicos.map((modulo) => (
              <View key={modulo.codigo} style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 7, fontWeight: 'bold', backgroundColor: `${gradoColor}30`, padding: 3 }}>
                  {modulo.codigo}: {modulo.nombre}
                </Text>
                <View style={styles.table}>
                  <View style={[styles.tableHeader, { backgroundColor: `${gradoColor}90` }]}>
                    <Text style={[styles.tableHeaderCell, { width: '30%' }]}>RESULTADO DE APRENDIZAJE</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P1</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP1</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P2</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP2</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P3</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP3</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>P4</Text>
                    <Text style={[styles.tableHeaderCell, styles.tableCellNota]}>RP4</Text>
                    <Text style={[styles.tableHeaderCell, { width: '10%' }]}>ESTADO</Text>
                  </View>
                  {modulo.resultadosAprendizaje.map((ra, idx) => {
                    const promRA = ((ra.p1 || 0) + (ra.p2 || 0) + (ra.p3 || 0) + (ra.p4 || 0)) / 4;
                    const estado = promRA >= 70 ? 'LOGRADO' : promRA >= 50 ? 'EN PROCESO' : 'NO LOGRADO';
                    const estadoColor = promRA >= 70 ? '#22c55e' : promRA >= 50 ? '#f59e0b' : '#ef4444';
                    return (
                      <View key={ra.codigo} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                        <View style={[styles.tableCell, { width: '30%', textAlign: 'left' }]}>
                          <Text style={{ fontWeight: 'bold', fontSize: 5 }}>{ra.codigo}</Text>
                          <Text style={{ fontSize: 5 }}>{ra.descripcion}</Text>
                        </View>
                        <NotaCell valor={ra.p1} />
                        <NotaCell valor={ra.rp1} />
                        <NotaCell valor={ra.p2} />
                        <NotaCell valor={ra.rp2} />
                        <NotaCell valor={ra.p3} />
                        <NotaCell valor={ra.rp3} />
                        <NotaCell valor={ra.p4} />
                        <NotaCell valor={ra.rp4} />
                        <View style={[styles.tableCell, { width: '10%' }]}>
                          <Text style={{ fontSize: 5, color: estadoColor, fontWeight: 'bold' }}>
                            {estado}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Leyenda */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, padding: 5, backgroundColor: '#f8fafc', borderRadius: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 6 }}>P = Período Ordinario</Text>
            <Text style={{ fontSize: 6 }}>RP = Recuperación Pedagógica</Text>
            <Text style={{ fontSize: 6 }}>CF = Calificación Final</Text>
            <Text style={{ fontSize: 6 }}>AA% = Asistencia Anual</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ width: 8, height: 8, backgroundColor: config.colorNotas.excelente, borderRadius: 2 }} />
              <Text style={{ fontSize: 5 }}>≥90</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ width: 8, height: 8, backgroundColor: config.colorNotas.bueno, borderRadius: 2 }} />
              <Text style={{ fontSize: 5 }}>80-89</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ width: 8, height: 8, backgroundColor: config.colorNotas.regular, borderRadius: 2 }} />
              <Text style={{ fontSize: 5 }}>70-79</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <View style={{ width: 8, height: 8, backgroundColor: config.colorNotas.deficiente, borderRadius: 2 }} />
              <Text style={{ fontSize: 5 }}>&lt;70</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageNumber}>Página 2 de 2</Text>
      </Page>
    </Document>
  );
};

export default PolitecnicoReportDocument;
