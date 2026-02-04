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
import {
  ReportCardData,
  PDFConfig,
  PAPER_DIMENSIONS,
  getGradeColor,
  getCompetencyStatus,
} from './types';
import { translations, Locale } from '../i18n';
import { getMediaUrl } from '../api';

// Registrar fuentes (opcional - usar fuentes del sistema)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
  ],
});

interface ReportCardDocumentProps {
  data: ReportCardData;
  config: PDFConfig;
}

export const ReportCardDocument: React.FC<ReportCardDocumentProps> = ({ data, config }) => {
  const t = translations[config.locale];
  const dimensions = PAPER_DIMENSIONS[config.paperSize];
  const { estudiante, institucion, calificaciones, promedioGeneral, asistencia, estadoFinal } = data;

  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      fontFamily: 'Roboto',
    },
    header: {
      flexDirection: 'row',
      marginBottom: 20,
      borderBottom: `2px solid ${institucion.colorPrimario}`,
      paddingBottom: 15,
    },
    logo: {
      width: 60,
      height: 60,
      marginRight: 15,
    },
    headerInfo: {
      flex: 1,
    },
    institutionName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: institucion.colorPrimario,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 9,
      color: '#666',
    },
    title: {
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 15,
      color: institucion.colorPrimario,
    },
    section: {
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      backgroundColor: institucion.colorPrimario,
      color: 'white',
      padding: 6,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    label: {
      width: 100,
      fontWeight: 'bold',
      color: '#333',
    },
    value: {
      flex: 1,
      color: '#555',
    },
    table: {
      marginTop: 10,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: institucion.colorPrimario,
      color: 'white',
      fontWeight: 'bold',
      fontSize: 8,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
    },
    tableRowAlt: {
      backgroundColor: '#f9f9f9',
    },
    tableCell: {
      padding: 5,
      textAlign: 'center',
    },
    tableCellSubject: {
      width: '20%',
      textAlign: 'left',
    },
    tableCellGrade: {
      width: '10%',
    },
    gradeCell: {
      padding: 4,
      borderRadius: 2,
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: 9,
    },
    statusBox: {
      marginTop: 20,
      padding: 15,
      borderRadius: 5,
      textAlign: 'center',
    },
    promoted: {
      backgroundColor: '#dcfce7',
      borderColor: '#22c55e',
      borderWidth: 2,
    },
    failed: {
      backgroundColor: '#fee2e2',
      borderColor: '#ef4444',
      borderWidth: 2,
    },
    statusText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    footer: {
      position: 'absolute',
      bottom: 40,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    signatureBox: {
      width: '30%',
      textAlign: 'center',
    },
    signatureLine: {
      borderTopWidth: 1,
      borderTopColor: '#333',
      marginTop: 40,
      paddingTop: 5,
    },
    pageNumber: {
      position: 'absolute',
      bottom: 20,
      right: 40,
      fontSize: 8,
      color: '#999',
    },
    attendanceGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 10,
    },
    attendanceItem: {
      textAlign: 'center',
      padding: 10,
      backgroundColor: '#f3f4f6',
      borderRadius: 5,
      width: '22%',
    },
    attendanceValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: institucion.colorPrimario,
    },
    attendanceLabel: {
      fontSize: 8,
      color: '#666',
      marginTop: 4,
    },
    observations: {
      marginTop: 15,
      padding: 10,
      backgroundColor: '#fffbeb',
      borderRadius: 5,
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
  });

  // Renderizar celda de nota con color
  const GradeCell = ({ value }: { value?: number }) => {
    if (value === undefined || value === null) {
      return <Text style={[styles.tableCell, styles.tableCellGrade]}>-</Text>;
    }
    const color = getGradeColor(value, config.gradeColors);
    return (
      <View style={[styles.gradeCell, { backgroundColor: color + '20' }]}>
        <Text style={{ color }}>{value.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <Document>
      {/* Página 1: Información del estudiante y observaciones */}
      <Page size={[dimensions.width, dimensions.height]} style={styles.page}>
        {/* Header con logo e info de institución */}
        <View style={styles.header}>
          {institucion.logoUrl && (
            <Image src={getMediaUrl(institucion.logoUrl)} style={styles.logo} />
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.institutionName}>{institucion.nombre}</Text>
            <Text style={styles.headerSubtitle}>
              {institucion.direccion}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t.grades.reportCard} - {data.cicloLectivo}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{t.pdf.studentInfo}</Text>

        {/* Información del estudiante */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>{t.grades.student}:</Text>
            <Text style={styles.value}>
              {estudiante.nombre} {estudiante.apellido}
            </Text>
          </View>
          {estudiante.matricula && (
            <View style={styles.row}>
              <Text style={styles.label}>Matrícula:</Text>
              <Text style={styles.value}>{estudiante.matricula}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Nivel:</Text>
            <Text style={styles.value}>{estudiante.nivel}</Text>
          </View>
          {estudiante.seccion && (
            <View style={styles.row}>
              <Text style={styles.label}>Sección:</Text>
              <Text style={styles.value}>{estudiante.seccion}</Text>
            </View>
          )}
        </View>

        {/* Asistencia */}
        {config.showAttendance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.attendance.title}</Text>
            <View style={styles.attendanceGrid}>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceValue}>{asistencia.diasPresente}</Text>
                <Text style={styles.attendanceLabel}>{t.attendance.present}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceValue}>{asistencia.diasAusente}</Text>
                <Text style={styles.attendanceLabel}>{t.attendance.absent}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceValue}>{asistencia.diasTarde}</Text>
                <Text style={styles.attendanceLabel}>{t.attendance.late}</Text>
              </View>
              <View style={styles.attendanceItem}>
                <Text style={styles.attendanceValue}>{asistencia.porcentaje}%</Text>
                <Text style={styles.attendanceLabel}>{t.attendance.percentage}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Observaciones */}
        {config.showObservations && data.observaciones && (
          <View style={styles.observations}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
              {t.grades.observations}:
            </Text>
            <Text>{data.observaciones}</Text>
          </View>
        )}

        {/* Estado Final */}
        <View
          style={[
            styles.statusBox,
            estadoFinal === 'PROMOVIDO' ? styles.promoted : styles.failed,
          ]}
        >
          <Text style={styles.statusText}>
            {t.pdf.finalStatus}:{' '}
            {estadoFinal === 'PROMOVIDO' ? t.grades.promoted : t.grades.failed}
          </Text>
          <Text style={{ marginTop: 5 }}>
            {t.grades.average}: {promedioGeneral.toFixed(2)}
          </Text>
        </View>

        {/* Footer con firmas */}
        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>{t.roles.DIRECTOR}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>{t.roles.DOCENTE}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>Padre/Tutor</Text>
          </View>
        </View>

        <Text style={styles.pageNumber}>
          {t.pdf.page} 1 {t.pdf.of} 2
        </Text>
      </Page>

      {/* Página 2: Matriz de calificaciones */}
      <Page size={[dimensions.width, dimensions.height]} style={styles.page}>
        {/* Header simplificado */}
        <View style={[styles.header, { marginBottom: 10 }]}>
          <View style={styles.headerInfo}>
            <Text style={styles.institutionName}>{institucion.nombre}</Text>
            <Text style={styles.headerSubtitle}>
              {estudiante.nombre} {estudiante.apellido} - {estudiante.nivel}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{t.pdf.academicRecord}</Text>

        {/* Tabla de calificaciones generales */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellSubject]}>{t.grades.subject}</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>P1</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>P2</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>P3</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>P4</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>CPC</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>CPEX</Text>
            <Text style={[styles.tableCell, styles.tableCellGrade]}>{t.grades.final}</Text>
          </View>

          {calificaciones
            .filter((c) => c.tipo === 'GENERAL')
            .map((cal, index) => (
              <View
                key={cal.materia}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, styles.tableCellSubject]}>{cal.materia}</Text>
                <GradeCell value={cal.p1} />
                <GradeCell value={cal.p2} />
                <GradeCell value={cal.p3} />
                <GradeCell value={cal.p4} />
                <GradeCell value={cal.cpc_30} />
                <GradeCell value={cal.cpex_70} />
                <GradeCell value={cal.final} />
              </View>
            ))}
        </View>

        {/* Módulos técnicos para Politécnico */}
        {config.showTechnicalModules && calificaciones.some((c) => c.tipo === 'TECNICA') && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>{t.grades.technicalModules}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, { width: '15%' }]}>Código RA</Text>
                <Text style={[styles.tableCell, { width: '45%' }]}>Competencia</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Valor</Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>Estado</Text>
              </View>

              {calificaciones
                .filter((c) => c.tipo === 'TECNICA')
                .flatMap((cal) => cal.modulosTecnicos || [])
                .map((mod, index) => (
                  <View
                    key={mod.codigo}
                    style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                  >
                    <Text style={[styles.tableCell, { width: '15%' }]}>{mod.codigo}</Text>
                    <Text style={[styles.tableCell, { width: '45%', textAlign: 'left' }]}>
                      {mod.nombre}
                    </Text>
                    <GradeCell value={mod.valor} />
                    <Text
                      style={[
                        styles.tableCell,
                        { width: '20%' },
                        {
                          color:
                            mod.competencia === 'LOGRADO'
                              ? '#22c55e'
                              : mod.competencia === 'EN_PROCESO'
                              ? '#f59e0b'
                              : '#ef4444',
                        },
                      ]}
                    >
                      {mod.competencia.replace('_', ' ')}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Promedio general */}
        <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
          <View
            style={{
              backgroundColor: institucion.colorPrimario,
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              {t.grades.average}: {promedioGeneral.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Fecha de emisión */}
        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 9, color: '#666' }}>
            {t.pdf.date}: {data.fechaEmision}
          </Text>
        </View>

        <Text style={styles.pageNumber}>
          {t.pdf.page} 2 {t.pdf.of} 2
        </Text>
      </Page>
    </Document>
  );
};

export default ReportCardDocument;
