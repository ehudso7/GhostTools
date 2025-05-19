import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logError } from '@/lib/sentry';
import { getStripe } from '@/lib/stripe';
import { applyRateLimit } from '@/lib/rate-limit';
import { env } from '@/lib/env-validation';

// Define the request schema using Zod
const subscribeRequestSchema = z.object({
  planId: z.enum(['starter', 'pro']),
  email: z.string().email().optional(),
  referral: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const { response: rateLimitResponse } = await applyRateLimit(request, {
      limit: 10,
      windowMs: 60 * 1000, // 1 minute
    });
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate the request
    const body = await request.json();
    const validationResult = subscribeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid plan selection', details: validationResult.error.issues }},
        { status: 400 }
      );
    }
    
    const { planId, email, referral } = validationResult.data;

    // Map plan IDs to Stripe price IDs
    const priceLookup: Record<string, string> = {
      starter: env().STRIPE_STARTER_PRICE_ID,
      pro: env().STRIPE_PRO_PRICE_ID,
    };
    
    const priceId = priceLookup[planId];
    
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: { message: 'Selected plan is not available' }},
        { status: 400 }
      );
    }

    // Get Stripe instance
    const stripe = getStripe();

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env().NEXT_PUBLIC_BASE_URL}/dashboard?sub_success=true`,
      cancel_url: `${env().NEXT_PUBLIC_BASE_URL}/pricing?cancelled=true`,
      customer_email: email || undefined, // Pre-fill email if provided
      allow_promotion_codes: true,
      // Collect customer address and name for better record-keeping
      billing_address_collection: 'auto',
      customer_creation: 'always',
      // Add Rewardful referral tracking
      client_reference_id: referral || undefined,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    logError(error, { context: 'stripe-subscription' });
    return NextResponse.json(
      { success: false, error: { message: 'An error occurred with the subscription process' }},
      { status: 500 }
    );
  }
}