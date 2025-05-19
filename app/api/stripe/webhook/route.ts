import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env-validation';
import { getStripe, StripeError, StripeErrorType } from '@/lib/stripe';
import { prisma, withTransaction } from '@/lib/prisma';
import { logError } from '@/lib/sentry';
import { trackStripeCheckoutConversion } from '@/lib/rewardful';

/**
 * Stripe webhook handler
 * Processes events from Stripe for payments and subscriptions
 * 
 * POST /api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }
    
    // Validate webhook secret from environment
    const webhookSecret = env().STRIPE_WEBHOOK_SECRET;
    
    // Construct and verify the event
    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      logError(err, { context: 'stripe-webhook', message: err.message });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
    
    // Process event based on type
    console.log(`Processing webhook event: ${event.id}, type: ${event.type}`);
    
    // Use a transaction for database operations when possible
    try {
      // Handle different event types
      switch (event.type) {
        // Checkout session events
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
          
        case 'checkout.session.async_payment_succeeded':
          await handleAsyncPaymentSucceeded(event.data.object as Stripe.Checkout.Session);
          break;
          
        case 'checkout.session.async_payment_failed':
          await handleAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
          break;
          
        // Subscription events
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
          
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
          
        // Invoice events
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
          
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
          
        // Ignore these test events
        case 'account.updated':
        case 'setup_intent.created':
        case 'payment_intent.created':
        case 'payment_method.attached':
          console.log(`Ignoring test event: ${event.type}`);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      logError(error, { 
        context: 'stripe-webhook-processing',
        eventType: event.type,
      });
      
      // Return 200 response to prevent Stripe from retrying
      // We still want to acknowledge receipt of the webhook
      return NextResponse.json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        handled: false,
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    logError(error, { context: 'stripe-webhook' });
    
    // For general errors, return 500
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Skip if no customer or user email
  if (!session.customer && !session.customer_email) {
    console.error('Checkout session missing customer details');
    return;
  }
  
  try {
    await withTransaction(async (tx) => {
      // Find user by email or customer ID
      const user = session.customer_email 
        ? await tx.user.findUnique({
            where: { email: session.customer_email },
            include: { credits: true },
          })
        : await findUserByCustomerId(String(session.customer), tx);
      
      if (!user) {
        throw new Error(`User not found for checkout session: ${session.id}`);
      }
      
      // Determine payment type and amount
      const isSubscription = !!session.subscription;
      const amount = session.amount_total || 0;
      
      // Check for Rewardful referral from session
      const referralId = session.client_reference_id;
      
      // Record payment
      await tx.paymentHistory.create({
        data: {
          userId: user.id,
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription?.toString() || null,
          amount,
          status: 'completed',
          type: isSubscription ? 'subscription' : 'one-time',
          referralId: referralId || null,
        },
      });
      
      // If one-time purchase, handle credits
      if (!isSubscription && amount > 0) {
        await handleOneTimePurchaseCredits(session, user, tx);
      }
      
      // Track Rewardful conversion if referral exists
      if (referralId) {
        console.log(`Tracking conversion for referral: ${referralId}, session: ${session.id}`);
        try {
          await trackStripeCheckoutConversion(
            referralId,
            session.id,
            amount,
            user.id,
            user.email,
            isSubscription
          );
        } catch (conversionError) {
          // Log error but don't fail the webhook
          console.error('Error tracking Rewardful conversion:', conversionError);
          logError(conversionError, { 
            context: 'rewardful-conversion',
            sessionId: session.id,
            referralId
          });
        }
      }
    });
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

/**
 * Handle checkout.session.async_payment_succeeded event
 */
async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  // This is similar to checkout.session.completed for async payments
  await handleCheckoutSessionCompleted(session);
}

/**
 * Handle checkout.session.async_payment_failed event
 */
async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  try {
    // Skip if no customer or user email
    if (!session.customer && !session.customer_email) {
      console.error('Checkout session missing customer details');
      return;
    }
    
    await withTransaction(async (tx) => {
      // Find user by email or customer ID
      const user = session.customer_email 
        ? await tx.user.findUnique({ where: { email: session.customer_email } })
        : await findUserByCustomerId(String(session.customer), tx);
      
      if (!user) {
        throw new Error(`User not found for checkout session: ${session.id}`);
      }
      
      // Record failed payment
      await tx.paymentHistory.create({
        data: {
          userId: user.id,
          stripeSessionId: session.id,
          stripeSubscriptionId: session.subscription?.toString() || null,
          amount: session.amount_total || 0,
          status: 'failed',
          type: session.mode === 'subscription' ? 'subscription' : 'one-time',
        },
      });
    });
  } catch (error) {
    console.error('Error handling async payment failed:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.created or customer.subscription.updated events
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await withTransaction(async (tx) => {
      const customerId = subscription.customer as string;
      const user = await findUserByCustomerId(customerId, tx);
      
      if (!user) {
        throw new Error(`User not found for customer: ${customerId}`);
      }
      
      // Get the price ID to determine the plan
      const priceId = subscription.items.data[0]?.price.id;
      if (!priceId) {
        throw new Error('Price ID not found in subscription');
      }
      
      // Determine plan based on price ID
      let planId = 'custom';
      const starterPriceId = env().STRIPE_STARTER_PRICE_ID;
      const proPriceId = env().STRIPE_PRO_PRICE_ID;
      
      if (priceId === starterPriceId) {
        planId = 'starter';
      } else if (priceId === proPriceId) {
        planId = 'pro';
      }
      
      // Update or create subscription record
      await tx.subscription.upsert({
        where: { stripeId: subscription.id },
        update: {
          status: subscription.status,
          planId,
          startDate: new Date(subscription.current_period_start * 1000),
          endDate: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          stripeId: subscription.id,
          status: subscription.status,
          planId,
          startDate: new Date(subscription.current_period_start * 1000),
          endDate: new Date(subscription.current_period_end * 1000),
        },
      });
      
      // Update user credits based on plan (only for active subscriptions)
      if (subscription.status === 'active') {
        // Credits per plan: starter=20, pro=unlimited (use high number)
        const creditsAmount = planId === 'starter' ? 20 : (planId === 'pro' ? 9999 : 0);
        
        if (creditsAmount > 0) {
          await tx.credits.upsert({
            where: { userId: user.id },
            update: { amount: creditsAmount },
            create: {
              userId: user.id,
              amount: creditsAmount,
            },
          });
        }
      }
    });
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await withTransaction(async (tx) => {
      // Update subscription status to canceled
      await tx.subscription.updateMany({
        where: { stripeId: subscription.id },
        data: {
          status: 'canceled',
          endDate: new Date(subscription.canceled_at || Date.now()),
          updatedAt: new Date(),
        },
      });
    });
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Skip if not subscription-related
  if (!invoice.subscription) return;
  
  try {
    await withTransaction(async (tx) => {
      // Find subscription in database
      const subscription = await tx.subscription.findUnique({
        where: { stripeId: invoice.subscription as string },
        include: { user: true },
      });
      
      if (!subscription) {
        console.error(`Subscription not found: ${invoice.subscription}`);
        return;
      }
      
      // Record payment
      await tx.paymentHistory.create({
        data: {
          userId: subscription.userId,
          stripeSubscriptionId: invoice.subscription as string,
          amount: invoice.amount_paid || 0,
          status: 'completed',
          type: 'subscription',
        },
      });
      
      // Update subscription period end date
      if (invoice.lines?.data?.[0]?.period?.end) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            endDate: new Date(invoice.lines.data[0].period.end * 1000),
            updatedAt: new Date(),
          },
        });
      }
    });
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Skip if not subscription-related
  if (!invoice.subscription) return;
  
  try {
    await withTransaction(async (tx) => {
      // Find subscription in database
      const subscription = await tx.subscription.findUnique({
        where: { stripeId: invoice.subscription as string },
        include: { user: true },
      });
      
      if (!subscription) {
        console.error(`Subscription not found: ${invoice.subscription}`);
        return;
      }
      
      // Record failed payment
      await tx.paymentHistory.create({
        data: {
          userId: subscription.userId,
          stripeSubscriptionId: invoice.subscription as string,
          amount: invoice.amount_due || 0,
          status: 'failed',
          type: 'subscription',
        },
      });
      
      // Update subscription status if payment has failed multiple times
      if (invoice.attempt_count && invoice.attempt_count > 3) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'past_due' },
        });
      }
    });
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

/**
 * Find user by Stripe customer ID
 */
async function findUserByCustomerId(customerId: string, prismaClient: any) {
  // Get customer from Stripe
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  
  if (customer.deleted) {
    throw new Error(`Customer has been deleted: ${customerId}`);
  }
  
  // Find user by email
  const user = await prismaClient.user.findUnique({
    where: { email: customer.email },
    include: { credits: true },
  });
  
  return user;
}

/**
 * Helper to determine credits from checkout session
 */
function determineCreditsAmount(session: Stripe.Checkout.Session): number {
  const amountTotal = session.amount_total || 0;
  
  // One-time payments (based on price)
  if (session.mode === 'payment') {
    // AgentWrite: $5.00 (500 cents)
    if (amountTotal === 500) { 
      return 5;
    } 
    // PodScribe: $7.00 (700 cents)
    else if (amountTotal === 700) { 
      return 1;
    }
    // Credit Packages
    else if (amountTotal === 1500) { // 20 Credits: $15.00
      return 20;
    }
    else if (amountTotal === 3000) { // 50 Credits: $30.00
      return 50;
    }
    else if (amountTotal === 5000) { // 100 Credits: $50.00
      return 100;
    }
  }
  
  return 0;
}

/**
 * Handle one-time purchase credit allocation
 */
async function handleOneTimePurchaseCredits(
  session: Stripe.Checkout.Session,
  user: any,
  prismaClient: any
) {
  // Get line items from the session
  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  
  let creditsToAdd = 0;
  
  // First check if this is a legacy session
  creditsToAdd = determineCreditsAmount(session);
  
  if (creditsToAdd === 0) {
    // Process each line item for metadata-based credits
    for (const item of lineItems.data) {
      const productId = item.price?.product as string;
      
      if (productId) {
        // Retrieve product details
        const product = await stripe.products.retrieve(productId);
        
        // Check product metadata for credits
        if (product.metadata?.credits) {
          const itemCredits = parseInt(product.metadata.credits, 10);
          const quantity = item.quantity || 1;
          creditsToAdd += itemCredits * quantity;
        } else if (product.name?.toLowerCase().includes('credit')) {
          // Fallback based on amount paid - $1 = 1 credit
          // This is just a fallback, credits should be specified in metadata
          const amountPaid = item.amount_total || 0;
          creditsToAdd += Math.floor(amountPaid / 100); // Convert cents to dollars
        }
      }
    }
  }
  
  // If credits determined, update user credits
  if (creditsToAdd > 0) {
    await prismaClient.credits.upsert({
      where: { userId: user.id },
      update: { amount: (user.credits?.amount || 0) + creditsToAdd },
      create: {
        userId: user.id,
        amount: creditsToAdd,
      },
    });
    
    console.log(`Added ${creditsToAdd} credits to user ${user.id}`);
  }
}