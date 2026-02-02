/**
 * Factory para selección de templates de boletines según sistema educativo
 * Implementa el patrón Factory para crear el template correcto
 */

import React from 'react';
import {
  BoletinData,
  SistemaEducativo,
  TemplateMetadata,
} from '../types/boletin.types';
import {
  BoletinTemplate,
  TemplateConfig,
  getRegisteredTemplate,
  defaultTemplateConfig,
} from '../templates/base-template';

// Importar templates específicos
import { PolitecnicoDoTemplate } from '../templates/politecnico-do.template';
import { SecundariaDoTemplate } from '../templates/secundaria-do.template';
import { PrimariaDoTemplate } from '../templates/primaria-do.template';
import { PrimariaHtTemplate } from '../templates/primaria-ht.template';
import { SecundariaHtTemplate } from '../templates/secundaria-ht.template';

/**
 * Factory principal para obtener el template correcto según el sistema educativo
 */
export function getBoletinTemplate(
  sistemaEducativo: SistemaEducativo,
  data: BoletinData,
  config?: Partial<TemplateConfig>
): BoletinTemplate {
  // Primero verificar si hay un template registrado dinámicamente
  const RegisteredTemplate = getRegisteredTemplate(sistemaEducativo);
  if (RegisteredTemplate) {
    return new RegisteredTemplate(data, config);
  }

  // Usar el switch para templates built-in
  switch (sistemaEducativo) {
    case 'POLITECNICO_DO':
      return new PolitecnicoDoTemplate(data, config);

    case 'SECUNDARIA_GENERAL_DO':
      return new SecundariaDoTemplate(data, config);

    case 'PRIMARIA_DO':
      return new PrimariaDoTemplate(data, config);

    case 'PRIMARIA_HT':
      return new PrimariaHtTemplate(data, config);

    case 'SECUNDARIA_HT':
      return new SecundariaHtTemplate(data, config);

    default:
      // Default: usar template de secundaria general DO
      console.warn(
        `Sistema educativo "${sistemaEducativo}" no reconocido, usando template por defecto`
      );
      return new SecundariaDoTemplate(data, config);
  }
}

/**
 * Obtener metadata de un template sin necesidad de datos completos
 */
export function getTemplateMetadata(sistemaEducativo: SistemaEducativo): TemplateMetadata {
  // Crear datos mínimos para obtener metadata
  const dummyData: BoletinData = {
    estudiante: {
      id: '',
      nombre: '',
      apellido: '',
      matricula: '',
      grado: '',
      seccion: '',
    },
    institucion: {
      id: '',
      nombre: '',
      sistemaEducativo,
      colorPrimario: '#000000',
      pais: sistemaEducativo.endsWith('_HT') ? 'HT' : 'DO',
    },
    ciclo: {
      id: '',
      nombre: '',
      fechaInicio: '',
      fechaFin: '',
      añoEscolar: '',
    },
    calificaciones: [],
    asistencia: {
      totalDias: 0,
      diasPresente: 0,
      porcentajeAnual: 0,
    },
    situacionFinal: 'EN_PROCESO',
    fechaEmision: '',
  };

  const template = getBoletinTemplate(sistemaEducativo, dummyData);
  return template.getMetadata();
}

/**
 * Verificar si un sistema educativo tiene template disponible
 */
export function hasTemplateAvailable(sistemaEducativo: SistemaEducativo): boolean {
  const availableSystems: SistemaEducativo[] = [
    'POLITECNICO_DO',
    'SECUNDARIA_GENERAL_DO',
    'PRIMARIA_DO',
    'PRIMARIA_HT',
    'SECUNDARIA_HT',
  ];
  return availableSystems.includes(sistemaEducativo);
}

/**
 * Obtener lista de sistemas educativos con templates disponibles
 */
export function getAvailableSystems(): SistemaEducativo[] {
  return [
    'POLITECNICO_DO',
    'SECUNDARIA_GENERAL_DO',
    'PRIMARIA_DO',
    'PRIMARIA_HT',
    'SECUNDARIA_HT',
  ];
}

/**
 * Crear configuración por defecto para un sistema educativo
 */
export function createDefaultConfigForSystem(
  sistemaEducativo: SistemaEducativo
): TemplateConfig {
  const baseConfig = { ...defaultTemplateConfig };

  // Ajustar locale según país
  if (sistemaEducativo.endsWith('_HT')) {
    baseConfig.locale = 'fr';
  } else {
    baseConfig.locale = 'es';
  }

  return baseConfig;
}

/**
 * Renderizar un boletín y obtener el elemento React
 */
export function renderBoletin(
  sistemaEducativo: SistemaEducativo,
  data: BoletinData,
  config?: Partial<TemplateConfig>
): React.ReactElement {
  const template = getBoletinTemplate(sistemaEducativo, data, config);
  return template.render();
}

/**
 * Validar datos antes de generar el boletín
 */
export function validateBoletinData(
  sistemaEducativo: SistemaEducativo,
  data: BoletinData
): { valid: boolean; errors: string[] } {
  const template = getBoletinTemplate(sistemaEducativo, data);
  return template.validateData();
}
