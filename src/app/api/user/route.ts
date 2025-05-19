import { NextRequest } from 'next/server';
import { withAuth } from '@/utils/api-auth';
import { successResponse, errorResponse } from '@/utils/api-response';
import { prisma } from '@/utils/db';

export async function GET(req: NextRequest) {
  return withAuth(req, async (req, userId) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          credits: true,
          subscriptions: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        return errorResponse({ message: 'User not found', status: 404 });
      }

      // Format response
      return successResponse({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        credits: user.credits?.amount || 0,
        hasSubscription: user.subscriptions.length > 0,
        subscriptionPlan: user.subscriptions[0]?.planId || null,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return errorResponse({ 
        message: 'Failed to fetch user', 
        status: 500 
      });
    }
  });
}