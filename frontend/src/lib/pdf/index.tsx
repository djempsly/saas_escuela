/**
 * Módulo de generación de PDFs para calificaciones
 * Sistema multi-tenant con soporte para diferentes sistemas educativos
 */

// ============================================
// EXPORTS DE TIPOS (nuevo sistema)
// ============================================
export * from './types/boletin.types';

// ============================================
// EXPORTS DE TEMPLATES (nuevo sistema)
// ============================================
export {
  BaseBoletinTemplate,
  defaultColorNotas,
  defaultGradeColors as templateGradeColors,
  defaultTemplateConfig,
  registerTemplate,
  getRegisteredTemplate,
} from './templates/base-template';

export type { BoletinTemplate, TemplateConfig } from './templates/base-template';

export { PolitecnicoDoTemplate } from './templates/politecnico-do.template';
export { SecundariaDoTemplate } from './templates/secundaria-do.template';
export { PrimariaDoTemplate } from './templates/primaria-do.template';
export { PrimariaHtTemplate } from './templates/primaria-ht.template';
export { SecundariaHtTemplate } from './templates/secundaria-ht.template';

// ============================================
// EXPORTS DE FACTORY (nuevo sistema)
// ============================================
export {
  getBoletinTemplate,
  getTemplateMetadata,
  hasTemplateAvailable,
  getAvailableSystems,
  createDefaultConfigForSystem,
  renderBoletin,
  validateBoletinData,
} from './factory/template-factory';

// ============================================
// EXPORTS LEGACY (compatibilidad hacia atrás)
// ============================================
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

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ReportCardDocument } from './report-card-document';
import { PolitecnicoReportDocument, PolitecnicoReportData, PolitecnicoConfig, defaultGradeColors as politecnicoDefaultColors } from './politecnico-report';
import { ReportCardData, PDFConfig, getPaperSize, GradeColors, EducationSystem } from './types';
import { Locale } from '../i18n';
import { BoletinData, SistemaEducativo } from './types/boletin.types';
import { TemplateConfig } from './templates/base-template';
import { getBoletinTemplate } from './factory/template-factory';

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
    paperSize: getPaperSize(sistemaEducativo as EducationSystem, nivel),
    gradeColors: defaultGradeColors,
    showTechnicalModules: isPolitecnico,
    showAttendance: true,
    showObservations: true,
    doubleSided: true,
  };
};

// ============================================
// FUNCIONES DEL NUEVO SISTEMA DE TEMPLATES
// ============================================

/**
 * Genera un boletín PDF como Blob usando el sistema de templates
 */
export const generateBoletinBlob = async (
  sistemaEducativo: SistemaEducativo,
  data: BoletinData,
  config?: Partial<TemplateConfig>
): Promise<Blob> => {
  const template = getBoletinTemplate(sistemaEducativo, data, config);
  const doc = template.render();
  // Cast to any to handle react-pdf type compatibility
  const blob = await pdf(doc as any).toBlob();
  return blob;
};

/**
 * Genera y descarga un boletín PDF
 */
export const downloadBoletin = async (
  sistemaEducativo: SistemaEducativo,
  data: BoletinData,
  config?: Partial<TemplateConfig>,
  filename?: string
): Promise<void> => {
  const blob = await generateBoletinBlob(sistemaEducativo, data, config);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `boletin_${data.estudiante.nombre}_${data.estudiante.apellido}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Genera y abre para imprimir un boletín PDF
 */
export const printBoletin = async (
  sistemaEducativo: SistemaEducativo,
  data: BoletinData,
  config?: Partial<TemplateConfig>
): Promise<void> => {
  const blob = await generateBoletinBlob(sistemaEducativo, data, config);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

// ============================================
// FUNCIONES LEGACY (compatibilidad)
// ============================================

// Generar PDF como Blob (legacy)
export const generateReportCardBlob = async (
  data: ReportCardData,
  config: PDFConfig
): Promise<Blob> => {
  const doc = <ReportCardDocument data={data} config={config} />;
  const blob = await pdf(doc).toBlob();
  return blob;
};

// Generar y descargar PDF (legacy)
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

// Generar y abrir para imprimir (legacy)
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

// Generar múltiples boletines como un solo documento (legacy)
export const generateBulkReportCards = async (
  students: ReportCardData[],
  config: PDFConfig
): Promise<Blob> => {
  if (students.length === 0) {
    throw new Error('No hay estudiantes para generar boletines');
  }
  return generateReportCardBlob(students[0], config);
};

// ============================================
// POLITÉCNICO REPORT FUNCTIONS (legacy)
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
