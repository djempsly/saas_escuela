-- CreateTable
CREATE TABLE "AvisoMantenimiento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvisoMantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvisoMantenimiento_activo_fechaFin_idx" ON "AvisoMantenimiento"("activo", "fechaFin");

-- AddForeignKey
ALTER TABLE "AvisoMantenimiento" ADD CONSTRAINT "AvisoMantenimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
