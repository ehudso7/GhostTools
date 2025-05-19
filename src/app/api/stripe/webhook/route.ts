import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe, PLANS } from '@/utils/stripe';
import { prisma } from '@/utils/db';

// This endpoint handles Stripe webhook events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          // Handle subscription creation
          await handleSubscriptionCreated(session);
        } else if (session.mode === 'payment') {
          // Handle one-time payment
          await handleOneTimePayment(session);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await handleSubscriptionRenewed(invoice);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Helper function to handle subscription creation
async function handleSubscriptionCreated(session: Stripe.Checkout.Session) {
  // Get the subscription from Stripe
  if (!session.subscription || !session.customer) return;
  
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );
  
  // Extract the plan ID from the subscription
  const planId = findPlanIdFromSubscription(subscription);
  
  if (!planId) {
    console.error('Could not determine plan ID from subscription');
    return;
  }
  
  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(session.customer as string);
  const userId = customer.metadata.userId;
  
  if (!userId) {
    console.error('Customer metadata does not contain userId');
    return;
  }
  
  // Create subscription record
  await prisma.subscription.create({
    data: {
      userId,
      stripeId: subscription.id,
      status: subscription.status,
      planId,
      startDate: new Date(subscription.current_period_start * 1000),
      endDate: new Date(subscription.current_period_end * 1000),
    },
  });
  
  // Add credits based on plan
  const planCredits = planId === 'starter' ? PLANS.STARTER.credits : PLANS.PRO.credits;
  
  await prisma.credits.upsert({
    where: { userId },
    create: {
      userId,
      amount: planCredits,
    },
    update: {
      amount: { increment: planCredits },
    },
  });
  
  // Create payment history record
  await prisma.paymentHistory.create({
    data: {
      userId,
      stripeSessionId: session.id,
      stripeSubscriptionId: subscription.id,
      amount: subscription.items.data[0].price.unit_amount || 0,
      status: 'completed',
      type: 'subscription',
    },
  });
}

// Helper function to handle one-time payment
async function handleOneTimePayment(session: Stripe.Checkout.Session) {
  if (!session.customer) return;
  
  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(session.customer as string);
  const userId = customer.metadata.userId;
  
  if (!userId) {
    console.error('Customer metadata does not contain userId');
    return;
  }
  
  // Add credits (assuming a standard credits package)
  await prisma.credits.upsert({
    where: { userId },
    create: {
      userId,
      amount: 20, // Default credits for one-time purchase
    },
    update: {
      amount: { increment: 20 },
    },
  });
  
  // Create payment history record
  await prisma.paymentHistory.create({
    data: {
      userId,
      stripeSessionId: session.id,
      amount: session.amount_total || 0,
      status: 'completed',
      type: 'one-time',
    },
  });
}

// Helper function to handle subscription updates
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find existing subscription in database
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeId: subscription.id },
  });
  
  if (!existingSubscription) {
    console.error('Subscription not found in database');
    return;
  }
  
  // Extract the plan ID from the subscription
  const planId = findPlanIdFromSubscription(subscription);
  
  if (!planId) {
    console.error('Could not determine plan ID from subscription');
    return;
  }
  
  // Update subscription record
  await prisma.subscription.update({
    where: { stripeId: subscription.id },
    data: {
      status: subscription.status,
      planId,
      startDate: new Date(subscription.current_period_start * 1000),
      endDate: new Date(subscription.current_period_end * 1000),
    },
  });
}

// Helper function to handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription record to canceled
  await prisma.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: {
      status: 'canceled',
      endDate: new Date(),
    },
  });
}

// Helper function to handle subscription renewal
async function handleSubscriptionRenewed(invoice: Stripe.Invoice) {
  if (!invoice.subscription || !invoice.customer) return;
  
  // Get the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  // Find existing subscription in database
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeId: subscription.id },
  });
  
  if (!existingSubscription) {
    console.error('Subscription not found in database');
    return;
  }
  
  // Extract the plan ID from the subscription
  const planId = findPlanIdFromSubscription(subscription);
  
  if (!planId) {
    console.error('Could not determine plan ID from subscription');
    return;
  }
  
  // Update subscription record
  await prisma.subscription.update({
    where: { stripeId: subscription.id },
    data: {
      status: subscription.status,
      startDate: new Date(subscription.current_period_start * 1000),
      endDate: new Date(subscription.current_period_end * 1000),
    },
  });
  
  // Add credits based on plan
  const planCredits = planId === 'starter' ? PLANS.STARTER.credits : PLANS.PRO.credits;
  
  await prisma.credits.update({
    where: { userId: existingSubscription.userId },
    data: {
      amount: { increment: planCredits },
    },
  });
  
  // Create payment history record
  await prisma.paymentHistory.create({
    data: {
      userId: existingSubscription.userId,
      stripeSubscriptionId: subscription.id,
      amount: invoice.amount_paid,
      status: 'completed',
      type: 'subscription',
    },
  });
}

// Helper function to handle payment failures
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  // Get the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );
  
  // Find existing subscription in database
  const existingSubscription = await prisma.subscription.findUnique({
    where: { stripeId: subscription.id },
  });
  
  if (!existingSubscription) {
    console.error('Subscription not found in database');
    return;
  }
  
  // Update subscription record status
  await prisma.subscription.update({
    where: { stripeId: subscription.id },
    data: {
      status: subscription.status,
    },
  });
  
  // Create payment history record for failed payment
  await prisma.paymentHistory.create({
    data: {
      userId: existingSubscription.userId,
      stripeSubscriptionId: subscription.id,
      amount: invoice.amount_due,
      status: 'failed',
      type: 'subscription',
    },
  });
}

// Helper function to determine plan ID from Stripe subscription
function findPlanIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  
  if (!item?.price?.id) return null;
  
  if (item.price.id === process.env.STRIPE_STARTER_PRICE_ID) {
    return 'starter';
  } else if (item.price.id === process.env.STRIPE_PRO_PRICE_ID) {
    return 'pro';
  }
  
  return null;
}

// Configure rate limiting for this route
export const dynamic = 'force-dynamic';