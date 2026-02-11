-- CreateEnum
CREATE TYPE "TipoCicloEducativo" AS ENUM ('INICIAL', 'PRIMARIA', 'SECUNDARIA', 'POLITECNICO', 'ADULTOS');

-- AlterTable
ALTER TABLE "CicloEducativo" ADD COLUMN     "tipo" "TipoCicloEducativo";
