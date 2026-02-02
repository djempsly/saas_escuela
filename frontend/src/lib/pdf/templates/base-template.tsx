/**
 * Interfaz base para todos los templates de boletines
 * Implementa el patrón Strategy para diferentes sistemas educativos
 */

import React from 'react';
import {
  BoletinData,
  TemplateMetadata,
  TemplateConfig,
  SistemaEducativo,
  ColorNotasConfig,
  GradeColorsConfig,
} from '../types/boletin.types';

// Re-export TemplateConfig for use in other modules
export type { TemplateConfig } from '../types/boletin.types';

// Colores por defecto para notas
export const defaultColorNotas: ColorNotasConfig = {
  excelente: '#22c55e',  // Verde - >= 90
  bueno: '#3b82f6',      // Azul - 80-89
  regular: '#f59e0b',    // Amarillo - 70-79
  deficiente: '#ef4444', // Rojo - < 70
};

// Colores por defecto por grado
export const defaultGradeColors: GradeColorsConfig = {
  '4to': '#3b82f6', // Azul
  '5to': '#22c55e', // Verde
  '6to': '#ef4444', // Rojo
  '1ro': '#8b5cf6', // Púrpura
  '2do': '#06b6d4', // Cian
  '3ro': '#f97316', // Naranja
  default: '#1a365d', // Azul oscuro
};

// Configuración por defecto
export const defaultTemplateConfig: TemplateConfig = {
  locale: 'es',
  colorNotas: defaultColorNotas,
  gradeColors: defaultGradeColors,
};

/**
 * Interfaz que deben implementar todos los templates de boletines
 * @public
 */
export interface BoletinTemplate {
  // Datos del boletín
  data: BoletinData;

  // Configuración del template
  config: TemplateConfig;

  // Método principal que retorna el documento PDF
  render(): React.ReactElement;

  // Obtener metadata del template
  getMetadata(): TemplateMetadata;

  // Validar que los datos son suficientes para generar el boletín
  validateData(): { valid: boolean; errors: string[] };
}

/**
 * Clase abstracta base que implementa funcionalidad común
 */
export abstract class BaseBoletinTemplate implements BoletinTemplate {
  data: BoletinData;
  config: TemplateConfig;

  constructor(data: BoletinData, config?: Partial<TemplateConfig>) {
    this.data = data;
    this.config = {
      ...defaultTemplateConfig,
      ...config,
      colorNotas: {
        ...defaultColorNotas,
        ...config?.colorNotas,
      },
      gradeColors: {
        ...defaultGradeColors,
        ...config?.gradeColors,
      },
    };
  }

  // Método abstracto que cada template debe implementar
  abstract render(): React.ReactElement;

  // Método abstracto para metadata específica
  abstract getMetadata(): TemplateMetadata;

  // Validación básica de datos
  validateData(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.data.estudiante) {
      errors.push('Faltan datos del estudiante');
    } else {
      if (!this.data.estudiante.nombre) errors.push('Falta nombre del estudiante');
      if (!this.data.estudiante.apellido) errors.push('Falta apellido del estudiante');
    }

    if (!this.data.institucion) {
      errors.push('Faltan datos de la institución');
    } else {
      if (!this.data.institucion.nombre) errors.push('Falta nombre de la institución');
    }

    if (!this.data.ciclo) {
      errors.push('Faltan datos del ciclo lectivo');
    }

    if (!this.data.calificaciones || this.data.calificaciones.length === 0) {
      errors.push('No hay calificaciones para mostrar');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Helper: Obtener color según nota
  protected getNotaColor(nota: number | undefined | null): string {
    if (nota === undefined || nota === null) return '#666666';
    if (nota >= 90) return this.config.colorNotas.excelente;
    if (nota >= 80) return this.config.colorNotas.bueno;
    if (nota >= 70) return this.config.colorNotas.regular;
    return this.config.colorNotas.deficiente;
  }

  // Helper: Obtener color del grado
  protected getGradoColor(grado: string): string {
    const gradoLower = grado.toLowerCase();
    for (const [key, color] of Object.entries(this.config.gradeColors)) {
      if (key !== 'default' && gradoLower.includes(key.toLowerCase())) {
        return color;
      }
    }
    return this.config.gradeColors.default;
  }

  // Helper: Formatear número a string con decimales
  protected formatNumber(num: number | undefined | null, decimals: number = 1): string {
    if (num === undefined || num === null) return '-';
    return num.toFixed(decimals);
  }

  // Helper: Calcular promedio de un array de números
  protected calcularPromedio(notas: (number | undefined | null)[]): number {
    const validas = notas.filter((n): n is number => n !== undefined && n !== null);
    if (validas.length === 0) return 0;
    return validas.reduce((a, b) => a + b, 0) / validas.length;
  }

  // Helper: Obtener el nombre completo del estudiante
  protected getNombreCompleto(): string {
    return `${this.data.estudiante.nombre} ${this.data.estudiante.apellido}`;
  }

  // Helper: Obtener año escolar formateado
  protected getAñoEscolar(): string {
    return this.data.ciclo.añoEscolar || this.data.ciclo.nombre;
  }
}

// Tipo para el constructor de templates
export type BoletinTemplateConstructor = new (
  data: BoletinData,
  config?: Partial<TemplateConfig>
) => BoletinTemplate;

// Registro de templates disponibles
export const templateRegistry: Map<SistemaEducativo, BoletinTemplateConstructor> = new Map();

// Función para registrar un template
export function registerTemplate(
  sistema: SistemaEducativo,
  templateClass: BoletinTemplateConstructor
): void {
  templateRegistry.set(sistema, templateClass);
}

// Función para obtener un template registrado
export function getRegisteredTemplate(
  sistema: SistemaEducativo
): BoletinTemplateConstructor | undefined {
  return templateRegistry.get(sistema);
}
