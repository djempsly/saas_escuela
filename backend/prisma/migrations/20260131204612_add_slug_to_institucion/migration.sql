/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Institucion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dominioPersonalizado]` on the table `Institucion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Institucion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Actividad" ADD COLUMN     "institucionId" TEXT,
ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autogestionActividades" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dominioPersonalizado" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "HistorialDirector" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "directorId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "motivo" TEXT,

    CONSTRAINT "HistorialDirector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistorialDirector_institucionId_idx" ON "HistorialDirector"("institucionId");

-- CreateIndex
CREATE INDEX "HistorialDirector_directorId_idx" ON "HistorialDirector"("directorId");

-- CreateIndex
CREATE INDEX "Actividad_institucionId_idx" ON "Actividad"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_slug_key" ON "Institucion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_dominioPersonalizado_key" ON "Institucion"("dominioPersonalizado");

-- AddForeignKey
ALTER TABLE "HistorialDirector" ADD CONSTRAINT "HistorialDirector_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialDirector" ADD CONSTRAINT "HistorialDirector_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
