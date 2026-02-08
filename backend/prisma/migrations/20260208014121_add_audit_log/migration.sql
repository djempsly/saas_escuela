-- CreateEnum
CREATE TYPE "AccionAudit" AS ENUM ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'IMPORTAR');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "accion" "AccionAudit" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "descripcion" TEXT NOT NULL,
    "datos" JSONB,
    "usuarioId" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_institucionId_createdAt_idx" ON "AuditLog"("institucionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
