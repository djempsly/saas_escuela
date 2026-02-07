-- DropIndex
DROP INDEX IF EXISTS "Clase_codigo_seccion_institucionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Clase_codigo_nivelId_seccion_institucionId_key" ON "Clase"("codigo", "nivelId", "seccion", "institucionId");
