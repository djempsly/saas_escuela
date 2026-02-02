-- CreateTable
CREATE TABLE "DiasLaborables" (
    "id" TEXT NOT NULL,
    "agosto" INTEGER NOT NULL DEFAULT 0,
    "septiembre" INTEGER NOT NULL DEFAULT 0,
    "octubre" INTEGER NOT NULL DEFAULT 0,
    "noviembre" INTEGER NOT NULL DEFAULT 0,
    "diciembre" INTEGER NOT NULL DEFAULT 0,
    "enero" INTEGER NOT NULL DEFAULT 0,
    "febrero" INTEGER NOT NULL DEFAULT 0,
    "marzo" INTEGER NOT NULL DEFAULT 0,
    "abril" INTEGER NOT NULL DEFAULT 0,
    "mayo" INTEGER NOT NULL DEFAULT 0,
    "junio" INTEGER NOT NULL DEFAULT 0,
    "claseId" TEXT NOT NULL,
    "cicloLectivoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiasLaborables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiasLaborables_claseId_cicloLectivoId_key" ON "DiasLaborables"("claseId", "cicloLectivoId");

-- AddForeignKey
ALTER TABLE "DiasLaborables" ADD CONSTRAINT "DiasLaborables_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiasLaborables" ADD CONSTRAINT "DiasLaborables_cicloLectivoId_fkey" FOREIGN KEY ("cicloLectivoId") REFERENCES "CicloLectivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
