-- AlterEnum
ALTER TYPE "AccionAudit" ADD VALUE 'DESINSCRIPCION';

-- AlterTable
ALTER TABLE "Inscripcion" ADD COLUMN     "activa" BOOLEAN NOT NULL DEFAULT true;
