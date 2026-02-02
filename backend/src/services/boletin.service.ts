/**
 * Generador de Boletín de Calificaciones - Nivel Secundario
 * República Dominicana - Ministerio de Educación
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  ITableCellOptions,
  convertInchesToTwip,
  TextDirection,
} from 'docx';

// Tipo para alineación vertical de celdas (sin 'both' que no es válido para tablas)
type TableCellVerticalAlign = 'top' | 'center' | 'bottom';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type Grado = '1er' | '2do' | '3er' | '4to' | '5to' | '6to';

export interface BoletinConfig {
  grado?: Grado;
  colorNota?: string;      // Hex sin # (ej: "D5E4AE")
  colorHeader?: string;    // Color para headers
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
// CONSTANTES
// ============================================================================

const COLORES = {
  HEADER: 'D5E4AE',
  SUBHEADER: 'EAF2D8',
  BLANCO: 'FFFFFF',
};

const AREAS_CURRICULARES = [
  'Lengua Española',
  'Lenguas Extranjeras (inglés)',
  'Lenguas Extranjeras (Francés)',
  'Matemática',
  'Ciencias Sociales',
  'Ciencias de la Naturaleza',
  'Educación Artística',
  'Educación Física',
  'Formación Integral Humana y Religiosa',
];

// ============================================================================
// HELPERS
// ============================================================================

const crearBorde = (color = '000000', size = 4) => ({
  style: BorderStyle.SINGLE,
  size,
  color,
});

const crearBordes = (color = '000000', size = 4) => {
  const border = crearBorde(color, size);
  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
  };
};

interface CeldaOptions {
  width?: number;
  fill?: string;
  bold?: boolean;
  fontSize?: number;
  rowSpan?: number;
  columnSpan?: number;
  verticalAlign?: TableCellVerticalAlign;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  textDirection?: (typeof TextDirection)[keyof typeof TextDirection];
}

const crearCelda = (texto: string, opciones: CeldaOptions = {}): TableCell => {
  const {
    width = 300,
    fill = COLORES.BLANCO,
    bold = false,
    fontSize = 8,
    rowSpan,
    columnSpan,
    verticalAlign = 'center' as TableCellVerticalAlign,
    alignment = AlignmentType.CENTER,
    textDirection,
  } = opciones;

  return new TableCell({
    borders: crearBordes(),
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    verticalAlign,
    rowSpan,
    columnSpan,
    textDirection,
    children: [
      new Paragraph({
        alignment,
        children: [
          new TextRun({
            text: texto,
            bold,
            size: fontSize * 2, // docx usa half-points
            font: 'Arial Narrow',
          }),
        ],
      }),
    ],
  });
};

// ============================================================================
// TABLA DE CALIFICACIONES
// ============================================================================

const crearTablaCalificaciones = (
  colorNota: string,
  colorHeader: string,
  colorSubheader: string,
  calificaciones?: Calificacion[]
): Table => {
  const anchoPeriodo = 380;
  const anchoPromedio = 400;
  const anchoCalFinal = 450;
  const anchoCompletiva = 380;
  const anchoExtraord = 380;
  const anchoEspecial = 380;
  const anchoSituacion = 280;
  const anchoAreaLabel = 600;
  const anchoAreaNombre = 1200;

  // Fila 0: Headers de competencias
  const fila0 = new TableRow({
    children: [
      crearCelda('COMPETENCIAS\nFUNDAMENTALES', {
        width: anchoAreaLabel + anchoAreaNombre,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        rowSpan: 2,
        columnSpan: 2,
      }),
      crearCelda('Comunicativa', {
        width: anchoPeriodo * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
      }),
      crearCelda('Pensamiento Lógico,\nCreativo y Crítico', {
        width: anchoPeriodo * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
      }),
      crearCelda('Científica y Tecnológica\nAmbiental y de la Salud', {
        width: anchoPeriodo * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
      }),
      crearCelda('Ética y Ciudadana\nDesarrollo Personal y Espiritual', {
        width: anchoPeriodo * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
      }),
      crearCelda('PROMEDIO GRUPO\nDE COMPETENCIAS', {
        width: anchoPromedio * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
        rowSpan: 2,
      }),
      crearCelda('CALIFICACIÓN\nFINAL DEL\nÁREA', {
        width: anchoCalFinal,
        fill: colorSubheader,
        bold: true,
        fontSize: 6,
        rowSpan: 3,
      }),
      crearCelda('CALIFICACIÓN COMPLETIVA', {
        width: anchoCompletiva * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
      }),
      crearCelda('CALIFICACIÓN EXTRAORDINARIA', {
        width: anchoExtraord * 4,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 4,
      }),
      crearCelda('EVALUACIÓN\nESPECIAL', {
        width: anchoEspecial * 2,
        fill: colorHeader,
        bold: true,
        fontSize: 7,
        columnSpan: 2,
      }),
      crearCelda('SITUACIÓN\nFINAL EN LA\nASIGNATURA', {
        width: anchoSituacion * 2,
        fill: colorHeader,
        bold: true,
        fontSize: 6,
        columnSpan: 2,
        rowSpan: 2,
      }),
    ],
  });

  // Fila 1: P1-P4 y sub-headers
  const periodos = ['P1', 'P2', 'P3', 'P4'];
  const fila1Children: TableCell[] = [];

  // P1-P4 para cada competencia (4 veces)
  for (let i = 0; i < 4; i++) {
    periodos.forEach(p => {
      fila1Children.push(crearCelda(p, { width: anchoPeriodo, fill: colorSubheader, bold: true, fontSize: 7 }));
    });
  }

  // Sub-headers completiva
  fila1Children.push(crearCelda('50%\nC. F.', { width: anchoCompletiva, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('C.E.C.', { width: anchoCompletiva, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('50%\nC.E.C.', { width: anchoCompletiva, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('C.C.F.', { width: anchoCompletiva, fill: colorSubheader, bold: true, fontSize: 6 }));

  // Sub-headers extraordinaria
  fila1Children.push(crearCelda('30%\nC.F.', { width: anchoExtraord, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('C.E. EX', { width: anchoExtraord, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('70%\nC.E. EX', { width: anchoExtraord, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('C.EX.F.', { width: anchoExtraord, fill: colorSubheader, bold: true, fontSize: 6 }));

  // Sub-headers especial
  fila1Children.push(crearCelda('C.F.', { width: anchoEspecial, fill: colorHeader, bold: true, fontSize: 6 }));
  fila1Children.push(crearCelda('C.E.', { width: anchoEspecial, fill: colorSubheader, bold: true, fontSize: 6 }));

  const fila1 = new TableRow({ children: fila1Children });

  // Fila 2: PERÍODOS
  const fila2Children: TableCell[] = [
    crearCelda('PERÍODOS', {
      width: anchoAreaLabel + anchoAreaNombre,
      fill: colorSubheader,
      bold: true,
      fontSize: 7,
      columnSpan: 2,
    }),
  ];

  // P1-P4 repetido 4 veces
  for (let i = 0; i < 4; i++) {
    periodos.forEach(p => {
      fila2Children.push(crearCelda(p, { width: anchoPeriodo, fill: colorSubheader, bold: true, fontSize: 7 }));
    });
  }

  // PC1-PC4
  ['PC1', 'PC2', 'PC3', 'PC4'].forEach(pc => {
    fila2Children.push(crearCelda(pc, { width: anchoPromedio, fill: colorSubheader, bold: true, fontSize: 7 }));
  });

  // Completiva
  fila2Children.push(crearCelda('50%\nC. F.', { width: anchoCompletiva, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('C.E.C.', { width: anchoCompletiva, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('50%\nC.E.C.', { width: anchoCompletiva, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('C.C.F.', { width: anchoCompletiva, fill: colorSubheader, bold: true, fontSize: 6 }));

  // Extraordinaria
  fila2Children.push(crearCelda('30%\nC.F.', { width: anchoExtraord, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('C.E. EX', { width: anchoExtraord, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('70%\nC.E. EX', { width: anchoExtraord, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('C.EX.F.', { width: anchoExtraord, fill: colorSubheader, bold: true, fontSize: 6 }));

  // Especial
  fila2Children.push(crearCelda('C.F.', { width: anchoEspecial, fill: colorHeader, bold: true, fontSize: 6 }));
  fila2Children.push(crearCelda('C.E.', { width: anchoEspecial, fill: colorSubheader, bold: true, fontSize: 6 }));

  // A y R
  fila2Children.push(crearCelda('A', { width: anchoSituacion, fill: colorHeader, bold: true, fontSize: 7 }));
  fila2Children.push(crearCelda('R', { width: anchoSituacion, fill: colorHeader, bold: true, fontSize: 7 }));

  const fila2 = new TableRow({ children: fila2Children });

  // Filas de áreas curriculares
  const filasAreas = AREAS_CURRICULARES.map((area, idx) => {
    const cal = calificaciones?.[idx];
    const children: TableCell[] = [
      crearCelda('ÁREAS\nCURRICULARES', { width: anchoAreaLabel, fill: colorHeader, bold: true, fontSize: 6 }),
      crearCelda(area, { width: anchoAreaNombre, fill: COLORES.BLANCO, fontSize: 8, alignment: AlignmentType.LEFT }),
    ];

    // 16 celdas para períodos (4 competencias x 4 períodos)
    const periodosData = [
      cal?.comunicativa,
      cal?.pensamientoLogico,
      cal?.cientifica,
      cal?.etica,
    ];

    periodosData.forEach(comp => {
      ['p1', 'p2', 'p3', 'p4'].forEach(p => {
        const valor = comp?.[p as keyof typeof comp];
        children.push(crearCelda(valor?.toString() || '', { width: anchoPeriodo, fill: colorNota }));
      });
    });

    // 4 promedios
    ['pc1', 'pc2', 'pc3', 'pc4'].forEach(pc => {
      const valor = cal?.promedios?.[pc as keyof typeof cal.promedios];
      children.push(crearCelda(valor?.toString() || '', { width: anchoPromedio, fill: colorNota }));
    });

    // Cal final
    children.push(crearCelda(cal?.calFinal?.toString() || '', { width: anchoCalFinal, fill: colorSubheader }));

    // Completiva
    children.push(crearCelda(cal?.completiva?.cf50?.toString() || '', { width: anchoCompletiva, fill: colorNota }));
    children.push(crearCelda(cal?.completiva?.cec?.toString() || '', { width: anchoCompletiva, fill: colorNota }));
    children.push(crearCelda(cal?.completiva?.cec50?.toString() || '', { width: anchoCompletiva, fill: colorNota }));
    children.push(crearCelda(cal?.completiva?.ccf?.toString() || '', { width: anchoCompletiva, fill: colorSubheader }));

    // Extraordinaria
    children.push(crearCelda(cal?.extraordinaria?.cf30?.toString() || '', { width: anchoExtraord, fill: colorNota }));
    children.push(crearCelda(cal?.extraordinaria?.ceEx?.toString() || '', { width: anchoExtraord, fill: colorNota }));
    children.push(crearCelda(cal?.extraordinaria?.ceEx70?.toString() || '', { width: anchoExtraord, fill: colorNota }));
    children.push(crearCelda(cal?.extraordinaria?.cexf?.toString() || '', { width: anchoExtraord, fill: colorSubheader }));

    // Especial
    children.push(crearCelda(cal?.especial?.cf?.toString() || '', { width: anchoEspecial, fill: colorNota }));
    children.push(crearCelda(cal?.especial?.ce?.toString() || '', { width: anchoEspecial, fill: colorSubheader }));

    // Situación A/R
    children.push(crearCelda(cal?.situacion?.aprobado ? '✓' : '', { width: anchoSituacion }));
    children.push(crearCelda(cal?.situacion?.reprobado ? '✓' : '', { width: anchoSituacion }));

    return new TableRow({ children });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [fila0, fila1, fila2, ...filasAreas],
  });
};

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

export async function generarBoletin(
  config: BoletinConfig = {},
  datosEstudiante?: DatosEstudiante,
  calificaciones?: Calificacion[]
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
                font: 'Arial'
              }),
              new TextRun({ text: '\t\t\t', size: 20 }),
              new TextRun({
                text: `Sección: ${datosEstudiante?.seccion || '________'}`,
                size: 20,
                font: 'Arial'
              }),
              new TextRun({ text: '\t\t', size: 20 }),
              new TextRun({
                text: `Número de orden: ${datosEstudiante?.numeroOrden || '________'}`,
                size: 20,
                font: 'Arial'
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
                font: 'Arial'
              }),
              new TextRun({ text: '\t', size: 20 }),
              new TextRun({
                text: `Tanda: ${datosEstudiante?.tanda || '__________'}`,
                size: 20,
                font: 'Arial'
              }),
              new TextRun({ text: '\t', size: 20 }),
              new TextRun({
                text: `Teléfono del centro: ${datosEstudiante?.telefonoCentro || '________________'}`,
                size: 20,
                font: 'Arial'
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `Provincia: ${datosEstudiante?.provincia || '________________________________'}`,
                size: 20,
                font: 'Arial'
              }),
              new TextRun({ text: '\t\t', size: 20 }),
              new TextRun({
                text: `Municipio: ${datosEstudiante?.municipio || '________________________________'}`,
                size: 20,
                font: 'Arial'
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
                font: 'Arial'
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
              new TextRun({ text: 'SITUACIÓN DEL/DE LA ESTUDIANTE', bold: true, size: 20, font: 'Arial' }),
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

// ============================================================================
// FUNCIÓN HELPER PARA GUARDAR ARCHIVO (opcional, para testing)
// ============================================================================

export async function guardarBoletin(
  filepath: string,
  config: BoletinConfig = {},
  datosEstudiante?: DatosEstudiante,
  calificaciones?: Calificacion[]
): Promise<void> {
  const fs = await import('fs');
  const buffer = await generarBoletin(config, datosEstudiante, calificaciones);
  fs.writeFileSync(filepath, buffer);
}
