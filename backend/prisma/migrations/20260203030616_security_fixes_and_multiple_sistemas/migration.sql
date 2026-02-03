-- SEGURIDAD: Eliminar campo passwordTemporal que guardaba contraseñas en texto plano
-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordTemporal";

-- CreateTable: Sistemas educativos múltiples por institución
CREATE TABLE "InstitucionSistemaEducativo" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "sistema" "SistemaEducativo" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitucionSistemaEducativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstitucionSistemaEducativo_institucionId_idx" ON "InstitucionSistemaEducativo"("institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitucionSistemaEducativo_institucionId_sistema_key" ON "InstitucionSistemaEducativo"("institucionId", "sistema");

-- AddForeignKey
ALTER TABLE "InstitucionSistemaEducativo" ADD CONSTRAINT "InstitucionSistemaEducativo_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrar sistemas educativos existentes a la nueva tabla
INSERT INTO "InstitucionSistemaEducativo" ("id", "institucionId", "sistema", "activo", "createdAt")
SELECT gen_random_uuid()::text, id, sistema, true, NOW()
FROM "Institucion"
ON CONFLICT ("institucionId", "sistema") DO NOTHING;
