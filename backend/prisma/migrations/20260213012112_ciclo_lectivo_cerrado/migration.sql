-- AlterTable
ALTER TABLE "CicloLectivo" ADD COLUMN     "cerrado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cerradoAt" TIMESTAMP(3);
