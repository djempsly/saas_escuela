-- AlterTable
ALTER TABLE "Materia" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "esOficial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pais" TEXT,
ADD COLUMN     "provisional" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Materia_institucionId_esOficial_idx" ON "Materia"("institucionId", "esOficial");
