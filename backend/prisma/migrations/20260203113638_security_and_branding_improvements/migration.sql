-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#059669',
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "heroSubtitle" TEXT,
ADD COLUMN     "heroTitle" TEXT,
ADD COLUMN     "loginBgColor" TEXT NOT NULL DEFAULT '#f3f4f6',
ADD COLUMN     "loginBgGradient" TEXT,
ADD COLUMN     "loginBgType" TEXT NOT NULL DEFAULT 'color',
ADD COLUMN     "loginLogoUrl" TEXT,
ADD COLUMN     "logoHeight" INTEGER DEFAULT 60,
ADD COLUMN     "logoWidth" INTEGER DEFAULT 120,
ADD COLUMN     "nombreMostrar" TEXT,
ALTER COLUMN "colorPrimario" SET DEFAULT '#1a56db',
ALTER COLUMN "colorSecundario" SET DEFAULT '#7c3aed';

-- AlterTable
ALTER TABLE "Nivel" ADD COLUMN     "gradoNumero" INTEGER;

-- CreateTable
CREATE TABLE "InstitucionDominio" (
    "id" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "dominio" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "sslActivo" BOOLEAN NOT NULL DEFAULT false,
    "verificadoAt" TIMESTAMP(3),
    "ultimoCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitucionDominio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstitucionDominio_dominio_key" ON "InstitucionDominio"("dominio");

-- CreateIndex
CREATE INDEX "InstitucionDominio_dominio_idx" ON "InstitucionDominio"("dominio");

-- CreateIndex
CREATE INDEX "InstitucionDominio_institucionId_idx" ON "InstitucionDominio"("institucionId");

-- AddForeignKey
ALTER TABLE "InstitucionDominio" ADD CONSTRAINT "InstitucionDominio_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
