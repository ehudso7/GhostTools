import Stripe from 'stripe';
import { env } from './env-validation';

/**
 * Stripe error types for better error handling
 */
export enum StripeErrorType {
  CARD_ERROR = 'card_error',
  VALIDATION_ERROR = 'validation_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  API_ERROR = 'api_error',
  IDEMPOTENCY_ERROR = 'idempotency_error',
  INVALID_REQUEST_ERROR = 'invalid_request_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Custom error class for Stripe errors
 */
export class StripeError extends Error {
  type: StripeErrorType;
  code?: string;
  param?: string;
  statusCode?: number;
  
  constructor(
    message: string, 
    type: StripeErrorType, 
    code?: string, 
    param?: string,
    statusCode?: number
  ) {
    super(message);
    this.name = 'StripeError';
    this.type = type;
    this.code = code;
    this.param = param;
    this.statusCode = statusCode;
  }
  
  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case StripeErrorType.CARD_ERROR:
        return this.getCardErrorMessage();
      case StripeErrorType.VALIDATION_ERROR:
        return 'The information provided is invalid.';
      case StripeErrorType.RATE_LIMIT_ERROR:
        return 'Too many requests. Please try again later.';
      case StripeErrorType.AUTHENTICATION_ERROR:
        return 'Payment service authentication failed. Please contact support.';
      case StripeErrorType.API_ERROR:
      case StripeErrorType.IDEMPOTENCY_ERROR:
        return 'Payment processing error. Please try again later.';
      default:
        return 'An error occurred during payment processing. Please try again.';
    }
  }
  
  /**
   * Get user-friendly card error message based on error code
   */
  private getCardErrorMessage(): string {
    switch (this.code) {
      case 'card_declined':
        return 'Your card was declined. Please try another payment method.';
      case 'expired_card':
        return 'Your card has expired. Please try another card.';
      case 'incorrect_cvc':
        return 'The security code (CVC) is incorrect. Please check and try again.';
      case 'processing_error':
        return 'An error occurred while processing your card. Please try again.';
      case 'incorrect_number':
        return 'Your card number is invalid. Please check and try again.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please try another payment method.';
      default:
        return 'There was an issue with your payment method. Please try again.';
    }
  }
}

// Singleton Stripe instance
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe instance with proper error handling
 */
export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }
  
  // Validate env variables
  const stripeSecretKey = env().STRIPE_SECRET_KEY;
  
  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    appInfo: {
      name: 'GhostTools',
      version: '1.0.0',
    },
    typescript: true,
  });
  
  return stripeInstance;
}

/**
 * Plan configuration with proper types
 */
export interface PlanConfig {
  name: string;
  description: string;
  price: string;
  priceAmount: number; // in cents
  priceId: () => string;
  credits: number | 'Unlimited';
  features: string[];
}

/**
 * Subscription plan configurations
 */
export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  starter: {
    name: 'Starter',
    description: 'Perfect for beginners',
    price: '$9.99/month',
    priceAmount: 999, // $9.99 in cents
    credits: 20,
    features: [
      'Access to AgentWrite',
      'Access to PodScribe',
      'Email support',
    ],
    priceId: () => env().STRIPE_STARTER_PRICE_ID,
  },
  pro: {
    name: 'Professional',
    description: 'For serious content creators',
    price: '$29.99/month',
    priceAmount: 2999, // $29.99 in cents
    credits: 'Unlimited',
    features: [
      'Unlimited access to all tools',
      'Advanced customization options',
      'Priority support',
      'API access',
    ],
    priceId: () => env().STRIPE_PRO_PRICE_ID,
  },
};

/**
 * One-time purchase prices (in cents)
 */
export const ONE_TIME_PRICES = {
  AGENT_WRITE: 500, // $5.00
  POD_SCRIBE: 700,  // $7.00
};

/**
 * Credit package configurations
 */
export const CREDIT_PACKAGES = [
  { 
    id: 'credits_20', 
    name: '20 Credits', 
    amount: 20, 
    price: 1500, // $15.00
    priceId: () => env().STRIPE_CREDITS_20_PRICE_ID || '', 
  },
  { 
    id: 'credits_50', 
    name: '50 Credits', 
    amount: 50, 
    price: 3000, // $30.00
    priceId: () => env().STRIPE_CREDITS_50_PRICE_ID || '',
  },
  { 
    id: 'credits_100', 
    name: '100 Credits', 
    amount: 100, 
    price: 5000, // $50.00
    priceId: () => env().STRIPE_CREDITS_100_PRICE_ID || '',
  },
];

/**
 * Create Stripe Checkout session for subscription
 */
export async function createSubscriptionCheckout(options: {
  planId: string;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  referral?: string;
}): Promise<string> {
  const { planId, customerId, customerEmail, successUrl, cancelUrl, metadata = {}, referral } = options;
  
  try {
    const stripe = getStripe();
    
    // Get plan configuration
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) {
      throw new StripeError(
        `Invalid plan ID: ${planId}`,
        StripeErrorType.VALIDATION_ERROR
      );
    }
    
    // Create checkout session with Rewardful tracking
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId(),
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        planId,
      },
      // Add Rewardful referral tracking
      client_reference_id: referral || undefined,
    });
    
    if (!session.url) {
      throw new StripeError(
        'Failed to create checkout session',
        StripeErrorType.API_ERROR
      );
    }
    
    return session.url;
  } catch (error) {
    // Handle Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      throw convertStripeError(error);
    }
    
    // Handle other errors
    throw new StripeError(
      error instanceof Error ? error.message : 'Unknown error',
      StripeErrorType.UNKNOWN_ERROR
    );
  }
}

/**
 * Create Stripe Checkout session for one-time payment
 */
export async function createOneTimeCheckout(options: {
  productName: string;
  productDescription: string;
  amount: number;
  customerId?: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  referral?: string;
}): Promise<string> {
  const { 
    productName, 
    productDescription,
    amount, 
    customerId, 
    customerEmail, 
    successUrl, 
    cancelUrl, 
    metadata = {},
    referral
  } = options;
  
  try {
    const stripe = getStripe();
    
    // Create checkout session with Rewardful tracking
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      // Add Rewardful referral tracking
      client_reference_id: referral || undefined,
    });
    
    if (!session.url) {
      throw new StripeError(
        'Failed to create checkout session',
        StripeErrorType.API_ERROR
      );
    }
    
    return session.url;
  } catch (error) {
    // Handle Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      throw convertStripeError(error);
    }
    
    // Handle other errors
    throw new StripeError(
      error instanceof Error ? error.message : 'Unknown error',
      StripeErrorType.UNKNOWN_ERROR
    );
  }
}

/**
 * Convert Stripe error to our custom error format
 */
function convertStripeError(error: Stripe.errors.StripeError): StripeError {
  let type: StripeErrorType;
  
  switch (error.type) {
    case 'StripeCardError':
      type = StripeErrorType.CARD_ERROR;
      break;
    case 'StripeInvalidRequestError':
      type = StripeErrorType.VALIDATION_ERROR;
      break;
    case 'StripeRateLimitError':
      type = StripeErrorType.RATE_LIMIT_ERROR;
      break;
    case 'StripeAuthenticationError':
      type = StripeErrorType.AUTHENTICATION_ERROR;
      break;
    case 'StripeAPIError':
      type = StripeErrorType.API_ERROR;
      break;
    case 'StripeIdempotencyError':
      type = StripeErrorType.IDEMPOTENCY_ERROR;
      break;
    default:
      type = StripeErrorType.UNKNOWN_ERROR;
      break;
  }
  
  return new StripeError(
    error.message,
    type,
    error.code,
    error.param,
    error.statusCode
  );
}