-- CreateEnum
CREATE TYPE "Tanda" AS ENUM ('MATUTINA', 'VESPERTINA', 'NOCTURNA', 'SABATINA', 'EXTENDIDA');

-- AlterTable
ALTER TABLE "Clase" ADD COLUMN     "seccion" TEXT,
ADD COLUMN     "tanda" "Tanda" NOT NULL DEFAULT 'MATUTINA';

-- AlterTable
ALTER TABLE "Institucion" ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "sector" TEXT;
