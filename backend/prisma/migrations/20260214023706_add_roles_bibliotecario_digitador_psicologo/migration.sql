-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'BIBLIOTECARIO';
ALTER TYPE "Role" ADD VALUE 'DIGITADOR';
ALTER TYPE "Role" ADD VALUE 'PSICOLOGO';

-- CreateTable
CREATE TABLE "ObservacionPsicologica" (
    "id" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "psicologoId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservacionPsicologica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObservacionPsicologica_estudianteId_idx" ON "ObservacionPsicologica"("estudianteId");

-- CreateIndex
CREATE INDEX "ObservacionPsicologica_psicologoId_idx" ON "ObservacionPsicologica"("psicologoId");

-- AddForeignKey
ALTER TABLE "ObservacionPsicologica" ADD CONSTRAINT "ObservacionPsicologica_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservacionPsicologica" ADD CONSTRAINT "ObservacionPsicologica_psicologoId_fkey" FOREIGN KEY ("psicologoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
