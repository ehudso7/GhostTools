import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logError } from '@/lib/sentry';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch user data from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        credits: true,
        subscriptions: {
          where: {
            // Only include active subscriptions or those that have ended recently
            OR: [
              { status: 'active' },
              { 
                status: 'canceled',
                endDate: { gt: new Date() }
              }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Format the user data for the client
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.credits?.amount || 0,
      subscription: user.subscriptions[0] ? {
        status: user.subscriptions[0].status,
        planId: user.subscriptions[0].planId,
        endDate: user.subscriptions[0].endDate,
      } : null,
    };
    
    return NextResponse.json(userData);
  } catch (error) {
    logError(error, { context: 'user-api' });
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}