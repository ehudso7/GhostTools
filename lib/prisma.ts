import { PrismaClient } from '@prisma/client';
import { env } from './env-validation';

// Prisma client connection options
const connectionOptions = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
};

// Global type declaration for PrismaClient instance
declare global {
  var prisma: PrismaClient | undefined;
}

// Set up a singleton connection instance to prevent duplicate connections
// during development with hot reloading
const prisma = global.prisma || new PrismaClient(connectionOptions);

// In development, attach to global to prevent multiple connections
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

// Health check function to verify database connectivity
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Simple query to check if database is responsive
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Transaction helper function
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

export { prisma };