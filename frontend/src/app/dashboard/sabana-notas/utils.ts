import type { Calificacion, Materia } from './types';

export const calcularPromedioPeriodo = (cal: Calificacion | undefined, periodo: string, rp: string): number => {
  if (!cal) return 0;

  if (cal.competencias && Object.keys(cal.competencias).length > 0) {
    let suma = 0;
    let count = 0;

    Object.values(cal.competencias).forEach(comp => {
      const pVal = (comp[periodo as keyof typeof comp] as number) || 0;
      const rpVal = (comp[rp as keyof typeof comp] as number) || 0;
      const notaMaxComp = Math.max(pVal, rpVal);

      if (notaMaxComp > 0) {
        suma += notaMaxComp;
        count++;
      }
    });

    return count > 0 ? Math.round(suma / count) : 0;
  }

  // Fallback: sistema simple o legacy
  const nota = Math.max((cal as any)[periodo] || 0, (cal as any)[rp] || 0);
  return nota;
};

export const calcularCF = (cal: Calificacion | undefined, isHaiti: boolean = false): number => {
  if (!cal) return 0;

  const p1 = calcularPromedioPeriodo(cal, 'p1', 'rp1');
  const p2 = calcularPromedioPeriodo(cal, 'p2', 'rp2');
  const p3 = calcularPromedioPeriodo(cal, 'p3', 'rp3');
  const p4 = calcularPromedioPeriodo(cal, 'p4', 'rp4');

  if (isHaiti) {
    if (p1 === 0 || p2 === 0 || p3 === 0) return 0;
    return Math.round((p1 + p2 + p3) / 3);
  } else {
    if (p1 === 0 || p2 === 0 || p3 === 0 || p4 === 0) return 0;
    return Math.round((p1 + p2 + p3 + p4) / 4);
  }
};

export const calcularSituacion = (cf: number): string => {
  if (cf === 0) return '';
  return cf >= 70 ? 'A' : 'R';
};

export const findMateriaByAsignatura = (
  materias: Materia[],
  asignatura: { codigo: string; nombre: string },
): Materia | undefined => {
  const byCode = materias.find(m => m.codigo === asignatura.codigo);
  if (byCode) return byCode;

  const asigNombre = asignatura.nombre.toLowerCase();
  const byFullName = materias.find(m => {
    const mNombre = m.nombre.toLowerCase();
    return mNombre === asigNombre || mNombre.includes(asigNombre) || asigNombre.includes(mNombre);
  });
  if (byFullName) return byFullName;

  const asigWords = asigNombre.split(/\s+/);
  const searchKey = asigWords.length >= 2 ? asigWords.slice(0, 2).join(' ') : asigWords[0];
  return materias.find(m => {
    const mNombre = m.nombre.toLowerCase();
    const mWords = mNombre.split(/\s+/);
    const mKey = mWords.length >= 2 ? mWords.slice(0, 2).join(' ') : mWords[0];
    return mNombre.includes(searchKey) || searchKey.includes(mKey);
  });
};
