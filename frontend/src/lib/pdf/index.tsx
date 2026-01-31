// Módulo de generación de PDFs para calificaciones

export * from './types';
export { ReportCardDocument } from './report-card-document';
export {
  PolitecnicoReportDocument,
  defaultGradeColors as politecnicoGradeColors,
  type PolitecnicoReportData,
  type PolitecnicoConfig,
  type CompetenciaCalificacion,
  type ModuloTecnico,
  type ResultadoAprendizaje,
} from './politecnico-report';

import { pdf } from '@react-pdf/renderer';
import { ReportCardDocument } from './report-card-document';
import { PolitecnicoReportDocument, PolitecnicoReportData, PolitecnicoConfig, defaultGradeColors as politecnicoDefaultColors } from './politecnico-report';
import { ReportCardData, PDFConfig, getPaperSize, GradeColors } from './types';
import { Locale } from '../i18n';

// Configuración por defecto de colores
export const defaultGradeColors: GradeColors = {
  excelente: '#22c55e',
  bueno: '#3b82f6',
  regular: '#f59e0b',
  deficiente: '#ef4444',
};

// Crear configuración por defecto basada en sistema educativo
export const createDefaultConfig = (
  sistemaEducativo: string,
  nivel?: string,
  locale: Locale = 'es'
): PDFConfig => {
  const isPolitecnico =
    sistemaEducativo.includes('POLITECNICO') || sistemaEducativo === 'POLITECNICO_DO';

  return {
    locale,
    paperSize: getPaperSize(sistemaEducativo as any, nivel),
    gradeColors: defaultGradeColors,
    showTechnicalModules: isPolitecnico,
    showAttendance: true,
    showObservations: true,
    doubleSided: true,
  };
};

// Generar PDF como Blob
export const generateReportCardBlob = async (
  data: ReportCardData,
  config: PDFConfig
): Promise<Blob> => {
  const doc = <ReportCardDocument data={data} config={config} />;
  const blob = await pdf(doc).toBlob();
  return blob;
};

// Generar y descargar PDF
export const downloadReportCard = async (
  data: ReportCardData,
  config: PDFConfig,
  filename?: string
): Promise<void> => {
  const blob = await generateReportCardBlob(data, config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `boletin_${data.estudiante.nombre}_${data.estudiante.apellido}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generar y abrir para imprimir
export const printReportCard = async (
  data: ReportCardData,
  config: PDFConfig
): Promise<void> => {
  const blob = await generateReportCardBlob(data, config);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

// Generar múltiples boletines como un solo documento
export const generateBulkReportCards = async (
  students: ReportCardData[],
  config: PDFConfig
): Promise<Blob> => {
  // Para bulk, generamos cada PDF y los combinamos
  // Por ahora, generamos uno por uno (en producción usaríamos pdf-lib para combinar)
  if (students.length === 0) {
    throw new Error('No hay estudiantes para generar boletines');
  }

  // Por simplicidad, devolvemos el primero
  // En implementación completa, combinaríamos todos los PDFs
  return generateReportCardBlob(students[0], config);
};

// ============================================
// POLITÉCNICO REPORT FUNCTIONS
// ============================================

// Crear configuración por defecto para Politécnico
export const createPolitecnicoConfig = (
  grado: string,
  locale: Locale = 'es'
): PolitecnicoConfig => {
  return {
    locale,
    gradeColors: politecnicoDefaultColors,
    colorNotas: {
      excelente: '#22c55e',
      bueno: '#3b82f6',
      regular: '#f59e0b',
      deficiente: '#ef4444',
    },
  };
};

// Generar PDF de Politécnico como Blob
export const generatePolitecnicoReportBlob = async (
  data: PolitecnicoReportData,
  config: PolitecnicoConfig
): Promise<Blob> => {
  const doc = <PolitecnicoReportDocument data={data} config={config} />;
  const blob = await pdf(doc).toBlob();
  return blob;
};

// Generar y descargar PDF de Politécnico
export const downloadPolitecnicoReport = async (
  data: PolitecnicoReportData,
  config: PolitecnicoConfig,
  filename?: string
): Promise<void> => {
  const blob = await generatePolitecnicoReportBlob(data, config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `sabana_politecnico_${data.estudiante.nombre}_${data.estudiante.apellido}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generar y abrir para imprimir PDF de Politécnico
export const printPolitecnicoReport = async (
  data: PolitecnicoReportData,
  config: PolitecnicoConfig
): Promise<void> => {
  const blob = await generatePolitecnicoReportBlob(data, config);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
