import { describe, it, expect } from 'vitest';
import { FormatoSabana } from '@prisma/client';
import { COMPETENCIAS_POR_FORMATO } from '../inscripcion.service';

describe('COMPETENCIAS_POR_FORMATO', () => {
  it('cubre todos los valores del enum FormatoSabana', () => {
    const enumValues = Object.values(FormatoSabana);
    const mapKeys = Object.keys(COMPETENCIAS_POR_FORMATO);

    for (const valor of enumValues) {
      expect(mapKeys, `Falta formato: ${valor}`).toContain(valor);
    }
  });

  it('no tiene keys extra fuera del enum', () => {
    const enumValues = Object.values(FormatoSabana) as string[];
    const mapKeys = Object.keys(COMPETENCIAS_POR_FORMATO);

    for (const key of mapKeys) {
      expect(enumValues, `Key extra no válida: ${key}`).toContain(key);
    }
  });

  it('cada formato tiene al menos 1 competencia', () => {
    for (const [formato, competencias] of Object.entries(COMPETENCIAS_POR_FORMATO)) {
      expect(competencias.length, `${formato} sin competencias`).toBeGreaterThan(0);
    }
  });

  it('todas las competencias son strings no vacíos', () => {
    for (const [formato, competencias] of Object.entries(COMPETENCIAS_POR_FORMATO)) {
      for (const comp of competencias) {
        expect(comp, `Competencia vacía en ${formato}`).toBeTruthy();
        expect(typeof comp).toBe('string');
      }
    }
  });

  it('INICIAL usa competencias IL (Indicadores de Logro)', () => {
    expect(COMPETENCIAS_POR_FORMATO.INICIAL_DO.every((c) => c.startsWith('IL'))).toBe(true);
    expect(COMPETENCIAS_POR_FORMATO.INICIAL_HT.every((c) => c.startsWith('IL'))).toBe(true);
  });

  it('PRIMARIA/SECUNDARIA/POLITECNICO usan competencias CF', () => {
    const formatosCF: FormatoSabana[] = [
      FormatoSabana.PRIMARIA_DO,
      FormatoSabana.PRIMARIA_HT,
      FormatoSabana.SECUNDARIA_DO,
      FormatoSabana.SECUNDARIA_HT,
      FormatoSabana.POLITECNICO_DO,
      FormatoSabana.ADULTOS,
    ];

    for (const fmt of formatosCF) {
      expect(
        COMPETENCIAS_POR_FORMATO[fmt].every((c) => c.startsWith('CF')),
        `${fmt} debería usar competencias CF`,
      ).toBe(true);
    }
  });

  it('PRIMARIA_DO tiene 5 competencias (CF1-CF5)', () => {
    expect(COMPETENCIAS_POR_FORMATO.PRIMARIA_DO).toEqual(['CF1', 'CF2', 'CF3', 'CF4', 'CF5']);
  });

  it('INICIAL_DO tiene 5 indicadores (IL1-IL5)', () => {
    expect(COMPETENCIAS_POR_FORMATO.INICIAL_DO).toEqual(['IL1', 'IL2', 'IL3', 'IL4', 'IL5']);
  });
});
