/**
 * Generador de Boletín de Calificaciones - Nivel Secundario
 * República Dominicana - Ministerio de Educación
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageOrientation,
  ShadingType,
  convertInchesToTwip,
} from 'docx';

import { COLORES, crearTablaCalificaciones } from './tabla.helpers';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type Grado = '1er' | '2do' | '3er' | '4to' | '5to' | '6to';

export interface BoletinConfig {
  grado?: Grado;
  colorNota?: string; // Hex sin # (ej: "D5E4AE")
  colorHeader?: string; // Color para headers
  colorSubheader?: string; // Color para subheaders
}

export interface DatosEstudiante {
  nombre?: string;
  seccion?: string;
  numeroOrden?: string;
  añoEscolarInicio?: string;
  añoEscolarFin?: string;
  centroEducativo?: string;
  codigoCentro?: string;
  tanda?: string;
  telefonoCentro?: string;
  provincia?: string;
  municipio?: string;
  distritoEducativo?: string;
  regionalEducacion?: string;
}

export interface Calificacion {
  area: string;
  comunicativa: { p1?: number; p2?: number; p3?: number; p4?: number };
  pensamientoLogico: { p1?: number; p2?: number; p3?: number; p4?: number };
  cientifica: { p1?: number; p2?: number; p3?: number; p4?: number };
  etica: { p1?: number; p2?: number; p3?: number; p4?: number };
  promedios: { pc1?: number; pc2?: number; pc3?: number; pc4?: number };
  calFinal?: number;
  completiva?: { cf50?: number; cec?: number; cec50?: number; ccf?: number };
  extraordinaria?: { cf30?: number; ceEx?: number; ceEx70?: number; cexf?: number };
  especial?: { cf?: number; ce?: number };
  situacion?: { aprobado?: boolean; reprobado?: boolean };
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

export async function generarBoletin(
  config: BoletinConfig = {},
  datosEstudiante?: DatosEstudiante,
  calificaciones?: Calificacion[],
): Promise<Buffer> {
  const {
    grado = '1er',
    colorNota = COLORES.HEADER,
    colorHeader = COLORES.HEADER,
    colorSubheader = COLORES.SUBHEADER,
  } = config;

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(14),
              height: convertInchesToTwip(8.5),
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: convertInchesToTwip(0.36),
              bottom: convertInchesToTwip(0.2),
              left: convertInchesToTwip(0.43),
              right: convertInchesToTwip(0.15),
            },
          },
        },
        children: [
          // Header institucional
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Viceministro de Servicios Técnicos y Pedagógicos Dirección General de Educación Secundaria',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          // Título
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: 'BOLETÍN DE CALIFICACIONES',
                bold: true,
                size: 32,
                font: 'Arial',
              }),
            ],
          }),

          // Datos del estudiante
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Año escolar: ${datosEstudiante?.añoEscolarInicio || '20____'}-${datosEstudiante?.añoEscolarFin || '20____'}`,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: '\t\t\t', size: 20 }),
              new TextRun({
                text: `Sección: ${datosEstudiante?.seccion || '________'}`,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: '\t\t', size: 20 }),
              new TextRun({
                text: `Número de orden: ${datosEstudiante?.numeroOrden || '________'}`,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Nombre(s): ${datosEstudiante?.nombre || '_____________________________________________________________________________'}`,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Centro educativo: ${datosEstudiante?.centroEducativo || '_______________________________________________________________________'}`,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Código del centro: ${datosEstudiante?.codigoCentro || '________________'}`,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: '\t', size: 20 }),
              new TextRun({
                text: `Tanda: ${datosEstudiante?.tanda || '__________'}`,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: '\t', size: 20 }),
              new TextRun({
                text: `Teléfono del centro: ${datosEstudiante?.telefonoCentro || '________________'}`,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Provincia: ${datosEstudiante?.provincia || '________________________________'}`,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: '\t\t', size: 20 }),
              new TextRun({
                text: `Municipio: ${datosEstudiante?.municipio || '________________________________'}`,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          // GRADO DINÁMICO
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Grado: ${grado} grado`,
                size: 20,
                font: 'Arial',
                bold: true,
              }),
              new TextRun({ text: '\t\t\t\t\t\t\t', size: 20 }),
              new TextRun({
                text: `Sección: ${datosEstudiante?.seccion || '________'}`,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),

          // Título calificaciones
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            shading: { fill: colorSubheader, type: ShadingType.CLEAR },
            children: [
              new TextRun({
                text: 'CALIFICACIONES DE RENDIMIENTO',
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),

          // Tabla
          crearTablaCalificaciones(colorNota, colorHeader, colorSubheader, calificaciones),

          // Situación
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text: 'SITUACIÓN DEL/DE LA ESTUDIANTE',
                bold: true,
                size: 20,
                font: 'Arial',
              }),
              new TextRun({ text: '\t\t\t', size: 20 }),
              new TextRun({ text: 'Promovido/a ☐', size: 20, font: 'Arial' }),
              new TextRun({ text: '\t\t', size: 20 }),
              new TextRun({ text: 'Repitente ☐', size: 20, font: 'Arial' }),
            ],
          }),

          // Firmas
          new Paragraph({
            spacing: { before: 300 },
            children: [
              new TextRun({ text: '________________________________', size: 20, font: 'Arial' }),
              new TextRun({ text: '\t\t\t\t\t\t\t', size: 20 }),
              new TextRun({ text: '________________________________', size: 20, font: 'Arial' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Maestro(a) encargado(a) del grado', size: 18, font: 'Arial' }),
              new TextRun({ text: '\t\t\t\t\t\t', size: 18 }),
              new TextRun({ text: 'Director(a) del Centro Educativo', size: 18, font: 'Arial' }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
