import Stripe from 'stripe';
import {
  getStripe,
  StripeError,
  StripeErrorType,
  createSubscriptionCheckout,
  createOneTimeCheckout,
  SUBSCRIPTION_PLANS
} from './stripe';

// Mock the env function
jest.mock('./env-validation', () => ({
  env: jest.fn(() => ({
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_STARTER_PRICE_ID: 'price_starter_mock',
    STRIPE_PRO_PRICE_ID: 'price_pro_mock',
    NEXT_PUBLIC_BASE_URL: 'https://example.com',
  })),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    customers: {
      retrieve: jest.fn(),
    },
    products: {
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('Stripe Utilities', () => {
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    // Clear mocks between tests
    jest.clearAllMocks();
    // Reset the Stripe singleton
    jest.resetModules();
    // Get the mocked Stripe instance
    mockStripe = getStripe() as unknown as jest.Mocked<Stripe>;
  });

  describe('getStripe', () => {
    it('should return a Stripe instance', () => {
      const stripe = getStripe();
      expect(stripe).toBeDefined();
      expect(Stripe).toHaveBeenCalledWith('sk_test_mock', {
        apiVersion: '2023-10-16',
        appInfo: {
          name: 'GhostTools',
          version: '1.0.0',
        },
      });
    });

    it('should return the same instance on subsequent calls', () => {
      const stripe1 = getStripe();
      const stripe2 = getStripe();
      expect(stripe1).toBe(stripe2);
      // Should only be called once
      expect(Stripe).toHaveBeenCalledTimes(1);
    });
  });

  describe('StripeError', () => {
    it('should create a proper error object', () => {
      const error = new StripeError(
        'Payment failed',
        StripeErrorType.CARD_ERROR,
        'card_declined'
      );

      expect(error.name).toBe('StripeError');
      expect(error.message).toBe('Payment failed');
      expect(error.type).toBe(StripeErrorType.CARD_ERROR);
      expect(error.code).toBe('card_declined');
    });

    it('should provide user-friendly error messages', () => {
      const cardError = new StripeError(
        'Payment failed',
        StripeErrorType.CARD_ERROR,
        'card_declined'
      );

      const authError = new StripeError(
        'Auth failed',
        StripeErrorType.AUTHENTICATION_ERROR
      );

      expect(cardError.getUserMessage()).toContain('card was declined');
      expect(authError.getUserMessage()).toContain('authentication failed');
    });
  });

  describe('createSubscriptionCheckout', () => {
    it('should create a subscription checkout session', async () => {
      // Mock successful checkout session creation
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/mock-session',
        id: 'cs_test_mock',
      } as unknown as Stripe.Checkout.Session);

      const result = await createSubscriptionCheckout({
        planId: 'starter',
        customerEmail: 'customer@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result).toBe('https://checkout.stripe.com/mock-session');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        customer: undefined,
        customer_email: 'customer@example.com',
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_starter_mock',
            quantity: 1,
          },
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          planId: 'starter',
        },
      });
    });

    it('should throw an error for invalid plan ID', async () => {
      await expect(
        createSubscriptionCheckout({
          planId: 'invalid_plan',
          customerEmail: 'customer@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Invalid plan ID');
    });

    it('should handle Stripe errors', async () => {
      // Mock Stripe error
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Stripe.errors.StripeCardError({
          type: 'card_error',
          charge: 'ch_mock',
          code: 'card_declined',
          doc_url: 'https://stripe.com/docs/error-codes/card-declined',
          param: 'card',
          raw: {
            message: 'Your card was declined',
            type: 'card_error',
            code: 'card_declined',
            param: 'card',
          },
          headers: {},
          statusCode: 402,
          requestId: 'req_mock',
        })
      );

      await expect(
        createSubscriptionCheckout({
          planId: 'starter',
          customerEmail: 'customer@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow(StripeError);
    });
  });

  describe('createOneTimeCheckout', () => {
    it('should create a one-time checkout session', async () => {
      // Mock successful checkout session creation
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/mock-session',
        id: 'cs_test_mock',
      } as unknown as Stripe.Checkout.Session);

      const result = await createOneTimeCheckout({
        productName: 'AgentWrite Credit',
        productDescription: 'Single use credit for AgentWrite',
        amount: 500,
        customerEmail: 'customer@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result).toBe('https://checkout.stripe.com/mock-session');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'payment',
        customer: undefined,
        customer_email: 'customer@example.com',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'AgentWrite Credit',
                description: 'Single use credit for AgentWrite',
              },
              unit_amount: 500,
            },
            quantity: 1,
          },
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {},
      });
    });
  });

  describe('SUBSCRIPTION_PLANS', () => {
    it('should have proper plan configurations', () => {
      expect(SUBSCRIPTION_PLANS.starter).toBeDefined();
      expect(SUBSCRIPTION_PLANS.pro).toBeDefined();
      
      // Validate starter plan
      expect(SUBSCRIPTION_PLANS.starter.name).toBe('Starter');
      expect(SUBSCRIPTION_PLANS.starter.priceAmount).toBe(999);
      expect(SUBSCRIPTION_PLANS.starter.credits).toBe(20);
      
      // Validate pro plan
      expect(SUBSCRIPTION_PLANS.pro.name).toBe('Professional');
      expect(SUBSCRIPTION_PLANS.pro.priceAmount).toBe(2999);
      expect(SUBSCRIPTION_PLANS.pro.credits).toBe('Unlimited');
      
      // Test price ID function
      expect(SUBSCRIPTION_PLANS.starter.priceId()).toBe('price_starter_mock');
      expect(SUBSCRIPTION_PLANS.pro.priceId()).toBe('price_pro_mock');
    });
  });
});