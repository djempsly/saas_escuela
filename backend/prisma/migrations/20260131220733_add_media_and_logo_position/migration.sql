-- AlterTable
ALTER TABLE "Actividad" ADD COLUMN     "fotos" JSONB,
ADD COLUMN     "tipoMedia" TEXT NOT NULL DEFAULT 'mixed',
ADD COLUMN     "videos" JSONB;

-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "logoPosicion" TEXT NOT NULL DEFAULT 'center';
