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

    // Verify feature is enabled
    if (!env().ENABLE_PODSCRIBE) {
      return NextResponse.json(
        { success: false, error: { message: 'This feature is currently unavailable' }},
        { status: 403 }
      );
    }

    // Create checkout session
    const checkoutUrl = await createOneTimeCheckout({
      productName: 'PodScribe Transcription',
      productDescription: 'One-time purchase for PodScribe podcast transcription',
      amount: ONE_TIME_PRICES.POD_SCRIBE,
      customerEmail: email,
      successUrl: `${env().NEXT_PUBLIC_BASE_URL}/podscribe?success=true`,
      cancelUrl: `${env().NEXT_PUBLIC_BASE_URL}/podscribe?canceled=true`,
      metadata: {
        product: 'pod_scribe',
        credits: '1', // One podcast transcription
      },
      referral,
    });

    return NextResponse.json({ success: true, url: checkoutUrl });
  } catch (error) {
    logError(error, { context: 'podscribe-checkout' });
    return NextResponse.json(
      { success: false, error: { message: 'An error occurred with the payment process' }},
      { status: 500 }
    );
  }
}