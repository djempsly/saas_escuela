-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA', 'PERIODO_GRACIA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "EstadoPagoSuscripcion" AS ENUM ('EXITOSO', 'FALLIDO', 'REEMBOLSADO');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "maxEstudiantes" INTEGER,
    "precioMensual" DECIMAL(10,2) NOT NULL,
    "precioAnual" DECIMAL(10,2) NOT NULL,
    "features" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "proximoPago" TIMESTAMP(3),
    "periodoGracia" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoHistorial" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "stripePaymentIntentId" TEXT,
    "estado" "EstadoPagoSuscripcion" NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_nombre_key" ON "Plan"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_institucionId_key" ON "Suscripcion"("institucionId");

-- CreateIndex
CREATE INDEX "Suscripcion_estado_idx" ON "Suscripcion"("estado");

-- CreateIndex
CREATE INDEX "PagoHistorial_suscripcionId_idx" ON "PagoHistorial"("suscripcionId");

-- CreateIndex
CREATE INDEX "PagoHistorial_institucionId_idx" ON "PagoHistorial"("institucionId");

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoHistorial" ADD CONSTRAINT "PagoHistorial_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoHistorial" ADD CONSTRAINT "PagoHistorial_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
