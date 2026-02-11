import { describe, it, expect } from 'vitest';
import { SistemaEducativo } from '@prisma/client';
import { calcularPromedioFinal } from '../calificacion.service';

const base = { estudianteId: 'e1', claseId: 'c1' };

describe('calcularPromedioFinal', () => {
  // ─── PRIMARIA_DO / SECUNDARIA_GENERAL_DO ───
  describe('PRIMARIA_DO (CPC 30% + Periodos 70%)', () => {
    it('calcula promedio con 4 periodos y CPC', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
        p1: 80,
        p2: 90,
        p3: 70,
        p4: 80,
        cpc_30: 25, // 25 de 30
      });
      // Promedio periodos = (80+90+70+80)/4 = 80
      // cpex_total = 80 * 70 / 100 = 56
      // total = 25 + 56 = 81
      expect(result.promedioFinal).toBe(81);
      expect(result.situacion).toBe('APROBADO');
    });

    it('APROBADO con >= 70', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
        p1: 70,
        p2: 70,
        p3: 70,
        p4: 70,
        cpc_30: 21, // 21 + (70*70/100)=49 = 70
      });
      expect(result.promedioFinal).toBe(70);
      expect(result.situacion).toBe('APROBADO');
    });

    it('APLAZADO entre 60 y 69', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
        p1: 60,
        p2: 60,
        p3: 60,
        p4: 60,
        cpc_30: 18, // 18 + (60*70/100)=42 = 60
      });
      expect(result.promedioFinal).toBe(60);
      expect(result.situacion).toBe('APLAZADO');
    });

    it('REPROBADO con < 60', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
        p1: 40,
        p2: 30,
        p3: 35,
        p4: 45,
        cpc_30: 10,
      });
      // Promedio = (40+30+35+45)/4 = 37.5
      // cpex = 37.5 * 70 / 100 = 26.25
      // total = 10 + 26.25 = 36.25
      expect(result.promedioFinal).toBe(36.25);
      expect(result.situacion).toBe('REPROBADO');
    });

    it('PENDIENTE con todos en 0', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
      });
      expect(result.promedioFinal).toBe(0);
      expect(result.situacion).toBe('PENDIENTE');
    });

    it('funciona con menos de 4 periodos', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
        p1: 80,
        p2: 90,
        cpc_30: 24,
      });
      // Promedio periodos = (80+90)/2 = 85
      // cpex = 85 * 70 / 100 = 59.5
      // total = 24 + 59.5 = 83.5
      expect(result.promedioFinal).toBe(83.5);
      expect(result.situacion).toBe('APROBADO');
    });
  });

  describe('SECUNDARIA_GENERAL_DO', () => {
    it('usa misma fórmula que PRIMARIA_DO', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_GENERAL_DO, {
        ...base,
        p1: 80,
        p2: 80,
        p3: 80,
        p4: 80,
        cpc_30: 24,
      });
      // cpex = 80 * 70 / 100 = 56, total = 24 + 56 = 80
      expect(result.promedioFinal).toBe(80);
      expect(result.situacion).toBe('APROBADO');
    });
  });

  // ─── SECUNDARIA_HT / PRIMARIA_HT ───
  describe('SECUNDARIA_HT (promedio simple, aprueba >= 50)', () => {
    it('calcula promedio simple de 3 periodos (P4 = 0)', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 60,
        p2: 70,
        p3: 80,
      });
      // (60+70+80)/3 = 70
      expect(result.promedioFinal).toBe(70);
      expect(result.situacion).toBe('APROBADO');
    });

    it('calcula promedio con 4 periodos si P4 > 0', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 60,
        p2: 70,
        p3: 80,
        p4: 50,
      });
      // (60+70+80+50)/4 = 65
      expect(result.promedioFinal).toBe(65);
      expect(result.situacion).toBe('APROBADO');
    });

    it('REPROBADO con promedio < 50', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 30,
        p2: 40,
        p3: 45,
      });
      // (30+40+45)/3 = 38.33
      expect(result.promedioFinal).toBe(38.33);
      expect(result.situacion).toBe('REPROBADO');
    });

    it('APROBADO exacto con 50', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 50,
        p2: 50,
        p3: 50,
      });
      expect(result.promedioFinal).toBe(50);
      expect(result.situacion).toBe('APROBADO');
    });

    it('PENDIENTE con todos en 0', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
      });
      expect(result.promedioFinal).toBe(0);
      expect(result.situacion).toBe('PENDIENTE');
    });

    it('ignora CPC (no aplica en HT)', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 60,
        p2: 70,
        p3: 80,
        cpc_30: 30, // debería ser ignorado
      });
      expect(result.promedioFinal).toBe(70);
    });
  });

  describe('PRIMARIA_HT', () => {
    it('usa misma fórmula que SECUNDARIA_HT', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_HT, {
        ...base,
        p1: 80,
        p2: 60,
        p3: 70,
      });
      expect(result.promedioFinal).toBe(70);
      expect(result.situacion).toBe('APROBADO');
    });
  });

  // ─── POLITECNICO_DO ───
  describe('POLITECNICO_DO (CPC 30% + Periodos 70%)', () => {
    it('calcula con 4 periodos y CPC', () => {
      const result = calcularPromedioFinal(SistemaEducativo.POLITECNICO_DO, {
        ...base,
        p1: 85,
        p2: 90,
        p3: 75,
        p4: 80,
        cpc_30: 27,
      });
      // Promedio = (85+90+75+80)/4 = 82.5
      // cpex = 82.5 * 70 / 100 = 57.75
      // total = 27 + 57.75 = 84.75
      expect(result.promedioFinal).toBe(84.75);
      expect(result.situacion).toBe('APROBADO');
    });

    it('APLAZADO entre 60 y 69', () => {
      const result = calcularPromedioFinal(SistemaEducativo.POLITECNICO_DO, {
        ...base,
        p1: 55,
        p2: 60,
        p3: 50,
        p4: 55,
        cpc_30: 15,
      });
      // Promedio = (55+60+50+55)/4 = 55
      // cpex = 55 * 70 / 100 = 38.5
      // total = 15 + 38.5 = 53.5
      expect(result.promedioFinal).toBe(53.5);
      expect(result.situacion).toBe('REPROBADO');
    });
  });

  // ─── Recuperaciones ───
  describe('Recuperaciones (rp1-rp4)', () => {
    it('usa recuperación si es mayor que nota original', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 30,
        rp1: 60, // recuperación mayor
        p2: 50,
        p3: 70,
      });
      // notaP1 = max(30, 60) = 60
      // (60+50+70)/3 = 60
      expect(result.promedioFinal).toBe(60);
      expect(result.situacion).toBe('APROBADO');
    });

    it('ignora recuperación si es menor que nota original', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 70,
        rp1: 50, // recuperación menor
        p2: 60,
        p3: 80,
      });
      // notaP1 = max(70, 50) = 70
      // (70+60+80)/3 = 70
      expect(result.promedioFinal).toBe(70);
    });

    it('recuperaciones funcionan en sistema DO', () => {
      const result = calcularPromedioFinal(SistemaEducativo.PRIMARIA_DO, {
        ...base,
        p1: 40,
        rp1: 75,
        p2: 80,
        p3: 70,
        p4: 60,
        cpc_30: 20,
      });
      // notaP1 = max(40, 75) = 75
      // Promedio = (75+80+70+60)/4 = 71.25
      // cpex = 71.25 * 70 / 100 = 49.875
      // total = 20 + 49.875 = 69.875 → 69.88
      expect(result.promedioFinal).toBe(69.88);
      expect(result.situacion).toBe('APLAZADO');
    });
  });

  // ─── Redondeo ───
  describe('Redondeo a 2 decimales', () => {
    it('redondea a 2 decimales', () => {
      const result = calcularPromedioFinal(SistemaEducativo.SECUNDARIA_HT, {
        ...base,
        p1: 33,
        p2: 33,
        p3: 34,
      });
      // (33+33+34)/3 = 33.333...
      expect(result.promedioFinal).toBe(33.33);
    });
  });
});
