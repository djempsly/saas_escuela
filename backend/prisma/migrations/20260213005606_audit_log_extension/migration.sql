-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccionAudit" ADD VALUE 'LOGIN';
ALTER TYPE "AccionAudit" ADD VALUE 'LOGOUT';
ALTER TYPE "AccionAudit" ADD VALUE 'PASSWORD_CAMBIADO';
ALTER TYPE "AccionAudit" ADD VALUE 'CALIFICACION_PUBLICADA';
ALTER TYPE "AccionAudit" ADD VALUE 'CONFIG_MODIFICADA';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_institucionId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "oldValue" JSONB,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "institucionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_entidadId_idx" ON "AuditLog"("entidadId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
