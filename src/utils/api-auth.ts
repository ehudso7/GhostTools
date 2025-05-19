import { NextRequest } from 'next/server';
import { getSession, getCurrentUser } from './auth';
import { unauthorizedResponse } from './api-response';

// Middleware to verify user authentication for API routes
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<Response>
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    return await handler(req, session.user.id);
  } catch (error) {
    console.error('Authentication error:', error);
    return unauthorizedResponse();
  }
}

// Middleware to verify user has required credits for an API route
export async function withCredits(
  req: NextRequest,
  handler: (req: NextRequest, userId: string) => Promise<Response>,
  requiredCredits: number
) {
  return withAuth(req, async (req, userId) => {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse();
    }

    // Check if user has subscription or sufficient credits
    const hasSubscription = user.subscriptions.length > 0;
    const hasCredits = user.credits?.amount >= requiredCredits;

    if (!hasSubscription && !hasCredits) {
      return unauthorizedResponse('Insufficient credits');
    }

    return await handler(req, userId);
  });
}