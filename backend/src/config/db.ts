import { PrismaClient } from '@prisma/client';

// Singleton para evitar múltiples instancias de Prisma en desarrollo
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;