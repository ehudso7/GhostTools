import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 999, // $9.99
    credits: 50,
    features: [
      'Access to AgentWrite tool',
      '50 credits per month',
      'Basic support',
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID!,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 2999, // $29.99
    credits: 200,
    features: [
      'Access to all tools',
      '200 credits per month',
      'Priority support',
      'Advanced customization options',
      'Team member access',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
};

// Helper to create checkout session
export async function createCheckoutSession({
  customerId,
  priceId,
  mode = 'subscription',
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  mode?: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
}) {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: customerId,
    },
  });
}

// Helper to create/get a customer
export async function getOrCreateCustomer({
  email,
  name,
  userId,
}: {
  email: string;
  name?: string;
  userId: string;
}) {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0];
  }

  return await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
}

// Helper to get subscription details
export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

// Helper to cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId);
}