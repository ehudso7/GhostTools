import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOneTimeCheckout, CREDIT_PACKAGES } from '@/lib/stripe';
import { logError } from '@/lib/sentry';
import { applyRateLimit } from '@/lib/rate-limit';
import { env } from '@/lib/env-validation';

// Define the request schema using Zod
const creditsCheckoutSchema = z.object({
  packageId: z.enum(['credits_20', 'credits_50', 'credits_100']),
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
    const validationResult = creditsCheckoutSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request', details: validationResult.error.issues }},
        { status: 400 }
      );
    }
    
    const { packageId, email, referral } = validationResult.data;

    // Find the credit package
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    
    if (!creditPackage) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credit package' }},
        { status: 400 }
      );
    }
    
    // Check if the price ID is configured
    const priceId = creditPackage.priceId();
    
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: { message: 'Credit package not available for purchase' }},
        { status: 400 }
      );
    }

    // Create checkout session
    const checkoutUrl = await createOneTimeCheckout({
      productName: creditPackage.name,
      productDescription: `Credits for using GhostTools products`,
      amount: creditPackage.price,
      customerEmail: email,
      successUrl: `${env().NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
      cancelUrl: `${env().NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      metadata: {
        product: 'credits',
        packageId: packageId,
        credits: creditPackage.amount.toString(),
      },
      referral,
    });

    return NextResponse.json({ success: true, url: checkoutUrl });
  } catch (error) {
    logError(error, { context: 'credits-checkout' });
    return NextResponse.json(
      { success: false, error: { message: 'An error occurred with the payment process' }},
      { status: 500 }
    );
  }
}