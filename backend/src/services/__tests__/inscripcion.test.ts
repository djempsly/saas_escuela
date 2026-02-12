import { vi } from 'vitest';

// ── Mock Prisma ──
const mockTx = vi.hoisted(() => {
  return {
    nivel: { findUnique: vi.fn() },
    user: { findFirst: vi.fn(), update: vi.fn() },
    cicloLectivo: { findFirst: vi.fn() },
    clase: { findMany: vi.fn() },
    inscripcion: { create: vi.fn(), findMany: vi.fn() },
    calificacion: { create: vi.fn() },
    calificacionCompetencia: { createMany: vi.fn() },
    calificacionTecnica: { createMany: vi.fn() },
  };
});

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock('../../config/db', () => ({ default: mockPrisma }));

import { describe, it, expect, beforeEach } from 'vitest';
import { FormatoSabana } from '@prisma/client';
import { inscribirEstudianteEnNivel } from '../inscripcion';
import { NotFoundError, ValidationError, ConflictError } from '../../errors';

// ── Factories ──
const INST_ID = 'inst-1';
const NIVEL_ID = 'nivel-1';
const EST_ID = 'est-1';
const CICLO_ID = 'ciclo-1';

const makeNivel = (formato: FormatoSabana) => ({
  id: NIVEL_ID,
  institucionId: INST_ID,
  formatoSabana: formato,
  nombre: 'Test Nivel',
});

const makeClase = (id: string, tipoMateria: string = 'GENERAL') => ({
  id,
  nivelId: NIVEL_ID,
  cicloLectivoId: CICLO_ID,
  materia: { tipo: tipoMateria },
});

/**
 * Configura los mocks del transaction client para un escenario exitoso.
 * Retorna el mockTx para hacer assertions.
 */
function setupHappyPath(formato: FormatoSabana, clases: ReturnType<typeof makeClase>[]) {
  mockTx.nivel.findUnique.mockResolvedValue(makeNivel(formato));
  mockTx.user.findFirst.mockResolvedValue({ id: EST_ID });
  mockTx.cicloLectivo.findFirst.mockResolvedValue({ id: CICLO_ID });
  mockTx.clase.findMany.mockResolvedValue(clases);
  mockTx.inscripcion.findMany.mockResolvedValue([]); // no duplicados
  mockTx.inscripcion.create.mockResolvedValue({});
  mockTx.calificacion.create.mockResolvedValue({});
  mockTx.calificacionCompetencia.createMany.mockResolvedValue({ count: 5 });
  mockTx.calificacionTecnica.createMany.mockResolvedValue({ count: 10 });
  mockTx.user.update.mockResolvedValue({});
}

describe('inscribirEstudianteEnNivel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Make $transaction call the callback with our mockTx
    mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx));
  });

  // ──────────────────────────────────────────────
  // 1. Inscripción exitosa SECUNDARIA_DO
  // ──────────────────────────────────────────────
  it('inscripción exitosa en SECUNDARIA_DO → inscripciones + calificaciones + 5 competencias por clase', async () => {
    const clases = [makeClase('clase-1'), makeClase('clase-2'), makeClase('clase-3')];
    setupHappyPath(FormatoSabana.SECUNDARIA_DO, clases);

    const result = await inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID);

    // Resultado correcto
    expect(result).toEqual({
      estudianteId: EST_ID,
      nivelId: NIVEL_ID,
      clasesInscritas: 3,
      calificacionesCreadas: 3,
      competenciasCreadas: 15, // 5 competencias × 3 clases
      tecnicasCreadas: 0, // no es POLITECNICO
    });

    // Verificar que se crearon las inscripciones
    expect(mockTx.inscripcion.create).toHaveBeenCalledTimes(3);
    for (const clase of clases) {
      expect(mockTx.inscripcion.create).toHaveBeenCalledWith({
        data: { estudianteId: EST_ID, claseId: clase.id },
      });
    }

    // Calificaciones generales: 1 por clase
    expect(mockTx.calificacion.create).toHaveBeenCalledTimes(3);

    // Competencias: CF1-CF5 por clase
    expect(mockTx.calificacionCompetencia.createMany).toHaveBeenCalledTimes(3);
    const firstCompCall = mockTx.calificacionCompetencia.createMany.mock.calls[0][0];
    expect(firstCompCall.data).toHaveLength(5);
    expect(firstCompCall.data.map((d: Record<string, unknown>) => d.competencia)).toEqual([
      'CF1', 'CF2', 'CF3', 'CF4', 'CF5',
    ]);

    // Sin calificaciones técnicas
    expect(mockTx.calificacionTecnica.createMany).not.toHaveBeenCalled();

    // nivelActualId actualizado
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: EST_ID },
      data: { nivelActualId: NIVEL_ID },
    });
  });

  // ──────────────────────────────────────────────
  // 2. POLITECNICO_DO con materia TECNICA → competencias + 10 RAs
  // ──────────────────────────────────────────────
  it('POLITECNICO_DO con materia TECNICA → crea competencias + 10 RAs', async () => {
    const clases = [
      makeClase('clase-general', 'GENERAL'),
      makeClase('clase-tecnica', 'TECNICA'),
    ];
    setupHappyPath(FormatoSabana.POLITECNICO_DO, clases);

    const result = await inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID);

    expect(result).toEqual({
      estudianteId: EST_ID,
      nivelId: NIVEL_ID,
      clasesInscritas: 2,
      calificacionesCreadas: 2,
      competenciasCreadas: 10, // 5 competencias × 2 clases
      tecnicasCreadas: 10, // 10 RAs para la clase TECNICA
    });

    // Calificaciones técnicas solo para la materia TECNICA
    expect(mockTx.calificacionTecnica.createMany).toHaveBeenCalledTimes(1);
    const raCall = mockTx.calificacionTecnica.createMany.mock.calls[0][0];
    expect(raCall.data).toHaveLength(10);
    expect(raCall.data[0]).toMatchObject({
      estudianteId: EST_ID,
      claseId: 'clase-tecnica',
      ra_codigo: 'RA1',
    });
    expect(raCall.data[9]).toMatchObject({ ra_codigo: 'RA10' });
  });

  it('POLITECNICO_DO con materia GENERAL → NO crea RAs', async () => {
    const clases = [makeClase('clase-general', 'GENERAL')];
    setupHappyPath(FormatoSabana.POLITECNICO_DO, clases);

    const result = await inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID);

    expect(result.tecnicasCreadas).toBe(0);
    expect(mockTx.calificacionTecnica.createMany).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // 3. Inscripción duplicada → ConflictError
  // ──────────────────────────────────────────────
  it('lanza ConflictError si el estudiante ya está inscrito', async () => {
    const clases = [makeClase('clase-1')];
    setupHappyPath(FormatoSabana.SECUNDARIA_DO, clases);
    // Simular que ya tiene inscripciones
    mockTx.inscripcion.findMany.mockResolvedValue([{ claseId: 'clase-1' }]);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(ConflictError);

    // No debería haber creado nada
    expect(mockTx.inscripcion.create).not.toHaveBeenCalled();
    expect(mockTx.calificacion.create).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────
  // 4. Nivel sin clases en ciclo activo → ValidationError
  // ──────────────────────────────────────────────
  it('lanza ValidationError si no hay clases en el ciclo activo', async () => {
    setupHappyPath(FormatoSabana.SECUNDARIA_DO, []);
    // findMany ya retorna [] por el setup

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(ValidationError);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(/No hay clases asignadas/);
  });

  it('lanza ValidationError si no hay ciclo lectivo activo', async () => {
    mockTx.nivel.findUnique.mockResolvedValue(makeNivel(FormatoSabana.SECUNDARIA_DO));
    mockTx.user.findFirst.mockResolvedValue({ id: EST_ID });
    mockTx.cicloLectivo.findFirst.mockResolvedValue(null);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(ValidationError);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(/ciclo lectivo activo/);
  });

  // ──────────────────────────────────────────────
  // 5. Estudiante inexistente → NotFoundError
  // ──────────────────────────────────────────────
  it('lanza NotFoundError si el estudiante no existe', async () => {
    mockTx.nivel.findUnique.mockResolvedValue(makeNivel(FormatoSabana.SECUNDARIA_DO));
    mockTx.user.findFirst.mockResolvedValue(null);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(NotFoundError);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(/Estudiante no encontrado/);
  });

  it('lanza NotFoundError si el nivel no existe', async () => {
    mockTx.nivel.findUnique.mockResolvedValue(null);

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('lanza NotFoundError si el nivel pertenece a otra institución', async () => {
    mockTx.nivel.findUnique.mockResolvedValue({
      ...makeNivel(FormatoSabana.SECUNDARIA_DO),
      institucionId: 'otra-inst',
    });

    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow(NotFoundError);
  });

  // ──────────────────────────────────────────────
  // 6. Atomicidad de la transacción
  // ──────────────────────────────────────────────
  it('la transacción es atómica: si falla a mitad, $transaction propaga el error', async () => {
    const clases = [makeClase('clase-1'), makeClase('clase-2')];
    setupHappyPath(FormatoSabana.SECUNDARIA_DO, clases);

    // La primera inscripción funciona, la segunda falla
    mockTx.inscripcion.create
      .mockResolvedValueOnce({}) // clase-1 OK
      .mockRejectedValueOnce(new Error('DB write failed')); // clase-2 falla

    // $transaction debe propagar el error (Prisma hace rollback automático)
    await expect(
      inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID),
    ).rejects.toThrow('DB write failed');

    // Verificar que $transaction fue llamado (la función se ejecutó dentro de ella)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it('todo el trabajo ocurre dentro de $transaction, no fuera', async () => {
    const clases = [makeClase('clase-1')];
    setupHappyPath(FormatoSabana.SECUNDARIA_DO, clases);

    await inscribirEstudianteEnNivel(EST_ID, NIVEL_ID, INST_ID);

    // Todas las operaciones usaron tx (mockTx), no prisma directamente
    // Si usaran prisma directo, estas calls estarían en mockPrisma, no en mockTx
    expect(mockTx.nivel.findUnique).toHaveBeenCalled();
    expect(mockTx.user.findFirst).toHaveBeenCalled();
    expect(mockTx.cicloLectivo.findFirst).toHaveBeenCalled();
    expect(mockTx.clase.findMany).toHaveBeenCalled();
    expect(mockTx.inscripcion.findMany).toHaveBeenCalled();
    expect(mockTx.inscripcion.create).toHaveBeenCalled();
    expect(mockTx.calificacion.create).toHaveBeenCalled();
    expect(mockTx.calificacionCompetencia.createMany).toHaveBeenCalled();
    expect(mockTx.user.update).toHaveBeenCalled();
  });
});
