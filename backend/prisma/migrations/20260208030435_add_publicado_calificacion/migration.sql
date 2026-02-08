-- AlterTable
ALTER TABLE "Calificacion" ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicadoAt" TIMESTAMP(3),
ADD COLUMN     "publicadoPor" TEXT;

-- AlterTable
ALTER TABLE "CalificacionCompetencia" ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicadoAt" TIMESTAMP(3),
ADD COLUMN     "publicadoPor" TEXT;
