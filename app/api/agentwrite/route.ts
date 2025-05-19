import { NextRequest, NextResponse } from 'next/server';
import { generateProductDescription } from '@/lib/openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/sentry';
import { z } from 'zod';
import { applyRateLimit } from '@/lib/rate-limit';
import { AIError, OpenAIErrorType } from '@/lib/openai';
import { apiHandler, ErrorType } from '@/lib/api-utils';

// Define input validation schema
const inputSchema = z.object({
  productName: z.string().min(1, "Product name is required").max(100, "Product name is too long"),
  productFeatures: z.string().min(1, "Product features are required").max(2000, "Product features text is too long"),
  targetAudience: z.string().min(1, "Target audience is required").max(500, "Target audience text is too long"),
  tone: z.string().min(1, "Tone is required").max(100, "Tone is too long"),
});

// Define response type
type AgentWriteResponse = {
  description: string;
  creditsRemaining?: number;
  subscriptionPlan?: string | null;
};

/**
 * AgentWrite API Route
 * Generates AI-powered product descriptions based on user input
 * 
 * POST /api/agentwrite
 */
export const POST = apiHandler<z.infer<typeof inputSchema>>(
  async (req, data, token) => {
    try {
      // Check if user has an active subscription or enough credits
      const user = await prisma.user.findUnique({
        where: { id: token.userId as string },
        include: {
          credits: true,
          subscriptions: {
            where: {
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
          { 
            success: false, 
            error: {
              type: ErrorType.NOT_FOUND,
              message: 'User not found'
            }
          },
          { status: 404 }
        );
      }
      
      // Check user subscription and credits
      const activeSubscription = user.subscriptions[0];
      const userCredits = user.credits?.amount || 0;
      
      const hasPro = activeSubscription?.planId === 'pro';
      const hasStarter = activeSubscription?.planId === 'starter';
      const hasCredits = userCredits > 0;
      
      if (!hasPro && !hasStarter && !hasCredits) {
        return NextResponse.json(
          { 
            success: false, 
            error: {
              type: ErrorType.AUTHORIZATION,
              message: 'Insufficient credits. Please purchase credits or subscribe to a plan.'
            }
          },
          { status: 403 }
        );
      }
      
      // Generate the description
      let description: string;
      try {
        description = await generateProductDescription(
          data!.productName,
          `Features: ${data!.productFeatures}\nTarget Audience: ${data!.targetAudience}\nTone: ${data!.tone}`
        );
      } catch (error) {
        if (error instanceof AIError) {
          // Handle specific OpenAI errors
          const status = error.type === OpenAIErrorType.CONTENT_FILTERED ? 400 : 500;
          return NextResponse.json(
            { 
              success: false, 
              error: {
                type: ErrorType.SERVICE_UNAVAILABLE,
                message: error.message,
                code: error.type
              }
            },
            { status }
          );
        }
        throw error;
      }
      
      // If user doesn't have pro plan, deduct a credit
      if (!hasPro && userCredits > 0) {
        await prisma.credits.update({
          where: { userId: user.id },
          data: { amount: { decrement: 1 } },
        });
      }
      
      // Record usage with proper JSON string formatting for metadata
      await prisma.usageHistory.create({
        data: {
          userId: user.id,
          toolName: 'agentwrite',
          creditsUsed: hasPro ? 0 : 1,
          metadata: JSON.stringify({
            productName: data!.productName,
            targetAudience: data!.targetAudience,
            tone: data!.tone,
            wordCount: description.split(/\s+/).length,
          }),
        },
      });
      
      // Prepare response
      const response: AgentWriteResponse = {
        description,
        creditsRemaining: hasPro ? null : userCredits - 1,
        subscriptionPlan: activeSubscription?.planId || null,
      };
      
      return NextResponse.json({ success: true, data: response });
    } catch (error) {
      logError(error, { context: 'agentwrite-api' });
      throw error; // Let apiHandler handle it
    }
  },
  {
    schema: inputSchema,
    requireAuth: true,
    rateLimitOptions: {
      limit: 20,
      windowMs: 60 * 1000, // 1 minute
    }
  }
);