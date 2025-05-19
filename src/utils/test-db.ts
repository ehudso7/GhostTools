import { PrismaClient } from '@prisma/client';

// PrismaClient for testing with SQLite
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const testPrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test.db'
      }
    },
    log: ['error'],
  });

if (process.env.NODE_ENV === 'test') globalForPrisma.prisma = testPrisma;