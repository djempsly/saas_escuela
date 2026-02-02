-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'system',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "allowPublicRegistration" BOOLEAN NOT NULL DEFAULT false,
    "maxInstitutionsPerPlan" INTEGER NOT NULL DEFAULT 10,
    "defaultSessionTimeout" INTEGER NOT NULL DEFAULT 24,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
