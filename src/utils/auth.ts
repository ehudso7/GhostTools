import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from './db';

// Helper function to get current user session on server
export async function getSession() {
  return await getServerSession(authOptions);
}

// Helper function to check if user is authenticated on server
export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.email) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      credits: true,
      subscriptions: {
        where: {
          status: 'active',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  });
  
  return user;
}

// Helper to check if user has an active subscription
export async function hasActiveSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      endDate: {
        gt: new Date(),
      },
    },
  });
  
  return !!subscription;
}

// Helper to check and deduct credits
export async function checkAndDeductCredits(userId: string, amount: number) {
  // Start a transaction
  return await prisma.$transaction(async (tx) => {
    const credits = await tx.credits.findUnique({
      where: { userId },
    });
    
    if (!credits || credits.amount < amount) {
      throw new Error('Insufficient credits');
    }
    
    return await tx.credits.update({
      where: { userId },
      data: { amount: { decrement: amount } },
    });
  });
}

// Helper to add usage history
export async function recordUsage(userId: string, toolName: string, creditsUsed: number, metadata?: any) {
  return await prisma.usageHistory.create({
    data: {
      userId,
      toolName,
      creditsUsed,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}