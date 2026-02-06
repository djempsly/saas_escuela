-- CreateTable
CREATE TABLE "CalificacionCompetencia" (
    "id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "p1" DOUBLE PRECISION DEFAULT 0,
    "p2" DOUBLE PRECISION DEFAULT 0,
    "p3" DOUBLE PRECISION DEFAULT 0,
    "p4" DOUBLE PRECISION DEFAULT 0,
    "rp1" DOUBLE PRECISION DEFAULT 0,
    "rp2" DOUBLE PRECISION DEFAULT 0,
    "rp3" DOUBLE PRECISION DEFAULT 0,
    "rp4" DOUBLE PRECISION DEFAULT 0,
    "estudianteId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "cicloLectivoId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalificacionCompetencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalificacionCompetencia_estudianteId_claseId_cicloLectivoId_key" ON "CalificacionCompetencia"("estudianteId", "claseId", "cicloLectivoId", "competencia");

-- AddForeignKey
ALTER TABLE "CalificacionCompetencia" ADD CONSTRAINT "CalificacionCompetencia_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionCompetencia" ADD CONSTRAINT "CalificacionCompetencia_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionCompetencia" ADD CONSTRAINT "CalificacionCompetencia_cicloLectivoId_fkey" FOREIGN KEY ("cicloLectivoId") REFERENCES "CicloLectivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
