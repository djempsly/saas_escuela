-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SistemaEducativo" ADD VALUE 'INICIAL_DO';
ALTER TYPE "SistemaEducativo" ADD VALUE 'INICIAL_HT';

-- AlterTable
ALTER TABLE "Institucion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Nivel" ADD COLUMN     "cicloEducativoId" TEXT;

-- CreateTable
CREATE TABLE "CicloEducativo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "institucionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CicloEducativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoordinadorCicloEducativo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CicloEducativo_nombre_institucionId_key" ON "CicloEducativo"("nombre", "institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "_CoordinadorCicloEducativo_AB_unique" ON "_CoordinadorCicloEducativo"("A", "B");

-- CreateIndex
CREATE INDEX "_CoordinadorCicloEducativo_B_index" ON "_CoordinadorCicloEducativo"("B");

-- AddForeignKey
ALTER TABLE "Nivel" ADD CONSTRAINT "Nivel_cicloEducativoId_fkey" FOREIGN KEY ("cicloEducativoId") REFERENCES "CicloEducativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloEducativo" ADD CONSTRAINT "CicloEducativo_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoordinadorCicloEducativo" ADD CONSTRAINT "_CoordinadorCicloEducativo_A_fkey" FOREIGN KEY ("A") REFERENCES "CicloEducativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoordinadorCicloEducativo" ADD CONSTRAINT "_CoordinadorCicloEducativo_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
