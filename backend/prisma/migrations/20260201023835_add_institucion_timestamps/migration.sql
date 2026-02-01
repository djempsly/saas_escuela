-- AlterTable - Add timestamps to Institucion
-- First add with default values to handle existing rows
ALTER TABLE "Institucion" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Institucion" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have proper timestamps
UPDATE "Institucion" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NOT NULL;
