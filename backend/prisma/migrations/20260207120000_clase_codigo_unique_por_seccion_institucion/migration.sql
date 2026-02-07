-- DropIndex
DROP INDEX IF EXISTS "Clase_codigo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Clase_codigo_seccion_institucionId_key" ON "Clase"("codigo", "seccion", "institucionId");
