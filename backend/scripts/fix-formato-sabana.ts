/**
 * Script de corrección: actualiza formatoSabana de todos los niveles existentes
 * según su cicloEducativo (campo tipo o fallback por nombre) + sistema de la institución.
 *
 * Uso:
 *   npx tsx scripts/fix-formato-sabana.ts          # dry-run (solo muestra cambios)
 *   npx tsx scripts/fix-formato-sabana.ts --apply   # aplica los cambios
 */
import { PrismaClient } from '@prisma/client';
import { determinarFormatoSabana } from '../src/utils/formato-sabana';

const prisma = new PrismaClient();
const dryRun = !process.argv.includes('--apply');

async function main() {
  console.log(dryRun ? '=== DRY RUN (no se aplicarán cambios) ===' : '=== APLICANDO CAMBIOS ===');
  console.log();

  const niveles = await prisma.nivel.findMany({
    include: {
      cicloEducativo: { select: { id: true, nombre: true, tipo: true } },
      institucion: { select: { id: true, nombre: true, sistema: true } },
    },
  });

  let actualizados = 0;
  let sinCiclo = 0;
  let sinMatch = 0;
  let sinCambio = 0;

  for (const nivel of niveles) {
    if (!nivel.cicloEducativo) {
      sinCiclo++;
      console.log(`⚠ SKIP  Nivel "${nivel.nombre}" (${nivel.id}) — sin cicloEducativo asignado`);
      continue;
    }

    const resultado = determinarFormatoSabana(nivel.cicloEducativo, nivel.institucion.sistema);

    if (!resultado) {
      sinMatch++;
      console.log(
        `⚠ SKIP  Nivel "${nivel.nombre}" — cicloEducativo "${nivel.cicloEducativo.nombre}" (tipo: ${nivel.cicloEducativo.tipo ?? 'null'}) no matchea`,
      );
      continue;
    }

    const cambios: string[] = [];
    if (nivel.formatoSabana !== resultado.formatoSabana) {
      cambios.push(`formatoSabana: ${nivel.formatoSabana} → ${resultado.formatoSabana}`);
    }
    if (nivel.numeroPeriodos !== resultado.numeroPeriodos) {
      cambios.push(`numeroPeriodos: ${nivel.numeroPeriodos} → ${resultado.numeroPeriodos}`);
    }
    if (nivel.usaModulosTec !== resultado.usaModulosTec) {
      cambios.push(`usaModulosTec: ${nivel.usaModulosTec} → ${resultado.usaModulosTec}`);
    }

    if (cambios.length === 0) {
      sinCambio++;
      continue;
    }

    console.log(
      `✏ UPDATE Nivel "${nivel.nombre}" (inst: ${nivel.institucion.nombre}, ciclo: "${nivel.cicloEducativo.nombre}", tipo: ${nivel.cicloEducativo.tipo ?? 'null'})`,
    );
    for (const c of cambios) {
      console.log(`         ${c}`);
    }

    if (!dryRun) {
      await prisma.nivel.update({
        where: { id: nivel.id },
        data: resultado,
      });
    }
    actualizados++;
  }

  console.log();
  console.log('--- Resumen ---');
  console.log(`Total niveles:    ${niveles.length}`);
  console.log(`Actualizados:     ${actualizados}`);
  console.log(`Sin cambio:       ${sinCambio}`);
  console.log(`Sin cicloEduc.:   ${sinCiclo}`);
  console.log(`Sin match:        ${sinMatch}`);

  if (dryRun && actualizados > 0) {
    console.log();
    console.log('Para aplicar los cambios, ejecuta:');
    console.log('  npx tsx scripts/fix-formato-sabana.ts --apply');
  }

  if (sinMatch > 0) {
    console.log();
    console.log('⚠ Para los niveles sin match, asigna el campo "tipo" al CicloEducativo:');
    console.log('  UPDATE "CicloEducativo" SET tipo = \'PRIMARIA\' WHERE id = \'...\';');
    console.log('  Opciones: INICIAL, PRIMARIA, SECUNDARIA, POLITECNICO, ADULTOS');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
