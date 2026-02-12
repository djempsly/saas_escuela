import prisma from '../../config/db';
import { SistemaEducativo } from '@prisma/client';
import { NotFoundError } from '../../errors';

// Interfaces para los diferentes tipos de calificaciones
export interface CalificacionGeneralInput {
  estudianteId: string;
  claseId: string;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  rp1?: number;
  rp2?: number;
  rp3?: number;
  rp4?: number;
  cpc_30?: number;
  cpc_nota?: number;
  cpex_70?: number;
  cpex_nota?: number;
}

export interface CalificacionTecnicaInput {
  estudianteId: string;
  claseId: string;
  ra_codigo: string;
  valor: number;
}

// Validar permisos sobre la clase
export const validarAccesoClase = async (claseId: string, institucionId: string) => {
  const clase = await prisma.clase.findFirst({
    where: { id: claseId, institucionId },
    select: {
      id: true,
      codigo: true,
      docenteId: true,
      nivelId: true,
      cicloLectivoId: true,
      materia: { select: { id: true, nombre: true, tipo: true, codigo: true, esOficial: true, orden: true } },
      institucion: { select: { sistema: true } },
    },
  });

  if (!clase) {
    throw new NotFoundError('Clase no encontrada');
  }

  return clase;
};

// Calcular promedio final según sistema educativo
export const calcularPromedioFinal = (
  sistema: SistemaEducativo,
  calificacion: CalificacionGeneralInput,
): { promedioFinal: number; situacion: string } => {
  const { p1 = 0, p2 = 0, p3 = 0, p4 = 0, cpc_30 = 0, cpex_70 = 0 } = calificacion;

  // Usar recuperaciones si existen y son mayores
  const rp1 = calificacion.rp1 || 0;
  const rp2 = calificacion.rp2 || 0;
  const rp3 = calificacion.rp3 || 0;
  const rp4 = calificacion.rp4 || 0;

  const notaP1 = Math.max(p1, rp1);
  const notaP2 = Math.max(p2, rp2);
  const notaP3 = Math.max(p3, rp3);
  const notaP4 = Math.max(p4, rp4);

  let promedioFinal = 0;
  let situacion = 'PENDIENTE';

  switch (sistema) {
    case SistemaEducativo.PRIMARIA_HT:
    case SistemaEducativo.SECUNDARIA_HT: {
      // Haití: Promedio simple de 4 periodos (o 3 si P4 es 0)
      const periodosHT = [notaP1, notaP2, notaP3, notaP4].filter((n) => n > 0);
      if (periodosHT.length > 0) {
        promedioFinal = periodosHT.reduce((a, b) => a + b, 0) / periodosHT.length;
      }
      // En Haití, generalmente se aprueba con 50/100 o 5/10
      situacion = promedioFinal >= 50 ? 'APROBADO' : promedioFinal > 0 ? 'REPROBADO' : 'PENDIENTE';
      break;
    }

    case SistemaEducativo.PRIMARIA_DO:
    case SistemaEducativo.SECUNDARIA_GENERAL_DO: {
      // RD General: CPC (30%) + Promedio Periodos (70%)
      const periodosDO = [notaP1, notaP2, notaP3, notaP4].filter((n) => n > 0);
      const promedioPeridos =
        periodosDO.length > 0 ? periodosDO.reduce((a, b) => a + b, 0) / periodosDO.length : 0;

      // CPC vale 30%, periodos valen 70%
      const cpc_total = cpc_30;
      const cpex_total = (promedioPeridos * 70) / 100;
      promedioFinal = cpc_total + cpex_total;

      // En RD se aprueba con 70
      if (promedioFinal >= 70) {
        situacion = 'APROBADO';
      } else if (promedioFinal >= 60) {
        situacion = 'APLAZADO';
      } else if (promedioFinal > 0) {
        situacion = 'REPROBADO';
      }
      break;
    }

    case SistemaEducativo.POLITECNICO_DO: {
      // Politécnico RD: Similar a general pero materias técnicas usan RA
      const periodosPoli = [notaP1, notaP2, notaP3, notaP4].filter((n) => n > 0);
      const promedioPoli =
        periodosPoli.length > 0 ? periodosPoli.reduce((a, b) => a + b, 0) / periodosPoli.length : 0;

      const cpcPoli = cpc_30;
      const cpexPoli = (promedioPoli * 70) / 100;
      promedioFinal = cpcPoli + cpexPoli;

      if (promedioFinal >= 70) {
        situacion = 'APROBADO';
      } else if (promedioFinal >= 60) {
        situacion = 'APLAZADO';
      } else if (promedioFinal > 0) {
        situacion = 'REPROBADO';
      }
      break;
    }
  }

  return {
    promedioFinal: Math.round(promedioFinal * 100) / 100,
    situacion,
  };
};
