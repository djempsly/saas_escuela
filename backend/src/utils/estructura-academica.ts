import { TipoCicloEducativo } from '@prisma/client';

export interface GradoTemplate {
  nombre: string;
  gradoNumero: number;
}

export interface CicloTemplate {
  nombre: string;
  tipo: TipoCicloEducativo;
  orden: number;
  grados: GradoTemplate[];
}

export interface EstructuraTemplate {
  ciclos: CicloTemplate[];
  gradosSinCiclo: GradoTemplate[];
}

const ESTRUCTURAS: Record<TipoCicloEducativo, EstructuraTemplate> = {
  INICIAL: {
    ciclos: [],
    gradosSinCiclo: [
      { nombre: 'Pre-Kinder', gradoNumero: 1 },
      { nombre: 'Kinder', gradoNumero: 2 },
      { nombre: 'Pre-Primario', gradoNumero: 3 },
    ],
  },
  PRIMARIA: {
    ciclos: [
      {
        nombre: 'Primer Ciclo',
        tipo: TipoCicloEducativo.PRIMARIA,
        orden: 1,
        grados: [
          { nombre: '1ro de Primaria', gradoNumero: 1 },
          { nombre: '2do de Primaria', gradoNumero: 2 },
          { nombre: '3ro de Primaria', gradoNumero: 3 },
        ],
      },
      {
        nombre: 'Segundo Ciclo',
        tipo: TipoCicloEducativo.PRIMARIA,
        orden: 2,
        grados: [
          { nombre: '4to de Primaria', gradoNumero: 4 },
          { nombre: '5to de Primaria', gradoNumero: 5 },
          { nombre: '6to de Primaria', gradoNumero: 6 },
        ],
      },
    ],
    gradosSinCiclo: [],
  },
  SECUNDARIA: {
    ciclos: [
      {
        nombre: 'Primer Ciclo',
        tipo: TipoCicloEducativo.SECUNDARIA,
        orden: 1,
        grados: [
          { nombre: '1ro de Secundaria', gradoNumero: 1 },
          { nombre: '2do de Secundaria', gradoNumero: 2 },
          { nombre: '3ro de Secundaria', gradoNumero: 3 },
        ],
      },
      {
        nombre: 'Segundo Ciclo',
        tipo: TipoCicloEducativo.SECUNDARIA,
        orden: 2,
        grados: [
          { nombre: '4to de Secundaria', gradoNumero: 4 },
          { nombre: '5to de Secundaria', gradoNumero: 5 },
          { nombre: '6to de Secundaria', gradoNumero: 6 },
        ],
      },
    ],
    gradosSinCiclo: [],
  },
  POLITECNICO: {
    ciclos: [
      {
        nombre: 'Primer Ciclo',
        tipo: TipoCicloEducativo.POLITECNICO,
        orden: 1,
        grados: [
          { nombre: '1ro Politécnico', gradoNumero: 1 },
          { nombre: '2do Politécnico', gradoNumero: 2 },
          { nombre: '3ro Politécnico', gradoNumero: 3 },
        ],
      },
      {
        nombre: 'Segundo Ciclo',
        tipo: TipoCicloEducativo.POLITECNICO,
        orden: 2,
        grados: [
          { nombre: '4to Politécnico', gradoNumero: 4 },
          { nombre: '5to Politécnico', gradoNumero: 5 },
          { nombre: '6to Politécnico', gradoNumero: 6 },
        ],
      },
    ],
    gradosSinCiclo: [],
  },
  ADULTOS: {
    ciclos: [],
    gradosSinCiclo: [],
  },
};

export function getEstructuraAcademica(tipo: TipoCicloEducativo): EstructuraTemplate {
  return ESTRUCTURAS[tipo];
}
