import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOneTimeCheckout, ONE_TIME_PRICES } from '@/lib/stripe';
import { logError } from '@/lib/sentry';
import { applyRateLimit } from '@/lib/rate-limit';
import { env } from '@/lib/env-validation';

// Define the request schema using Zod
const checkoutRequestSchema = z.object({
  email: z.string().email().optional(),
  referral: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    // Apply rate limiting
    const { response: rateLimitResponse } = await applyRateLimit(req, {
      limit: 10,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate the request
    const body = await req.json();
    const validationResult = checkoutRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request', details: validationResult.error.issues }},
        { status: 400 }
      );
    }
    
    const { email, referral } = validationResult.data;

    // Create checkout session
    const checkoutUrl = await createOneTimeCheckout({
      productName: 'AgentWrite Description Pack',
      productDescription: 'One-time purchase for AgentWrite content generation',
      amount: ONE_TIME_PRICES.AGENT_WRITE,
      customerEmail: email,
      successUrl: `${env().NEXT_PUBLIC_BASE_URL}/agentwrite?success=true`,
      cancelUrl: `${env().NEXT_PUBLIC_BASE_URL}/agentwrite?canceled=true`,
      metadata: {
        product: 'agent_write',
        credits: '5', // Number of credits to add
      },
      referral,
    });

    return NextResponse.json({ success: true, url: checkoutUrl });
  } catch (error) {
    logError(error, { context: 'agent-write-checkout' });
    return NextResponse.json(
      { success: false, error: { message: 'An error occurred with the payment process' }},
      { status: 500 }
    );
  }
}