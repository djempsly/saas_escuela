-- CreateEnum
CREATE TYPE "FormatoSabana" AS ENUM ('INICIAL_DO', 'INICIAL_HT', 'PRIMARIA_DO', 'PRIMARIA_HT', 'SECUNDARIA_DO', 'SECUNDARIA_HT', 'POLITECNICO_DO', 'ADULTOS');

-- AlterTable
ALTER TABLE "Nivel" ADD COLUMN     "formatoSabana" "FormatoSabana" NOT NULL DEFAULT 'SECUNDARIA_DO',
ADD COLUMN     "numeroPeriodos" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "usaCompetencias" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "usaModulosTec" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nivelActualId" TEXT;

-- CreateIndex
CREATE INDEX "Calificacion_estudianteId_cicloLectivoId_idx" ON "Calificacion"("estudianteId", "cicloLectivoId");

-- CreateIndex
CREATE INDEX "Clase_nivelId_cicloLectivoId_idx" ON "Clase"("nivelId", "cicloLectivoId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_nivelActualId_fkey" FOREIGN KEY ("nivelActualId") REFERENCES "Nivel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
