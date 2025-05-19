import { NextResponse } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Mock Stripe and Prisma
jest.mock('stripe', () => {
  return {
    Stripe: jest.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_123',
              customer_email: 'test@example.com',
              amount_total: 500,
              mode: 'payment',
            },
          },
        }),
      },
    })),
  };
});

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: jest.fn().mockResolvedValue({ id: 'user_123' }),
    },
    credits: {
      upsert: jest.fn().mockResolvedValue({ amount: 1 }),
    },
    paymentHistory: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn().mockReturnValue('test_signature'),
  })),
}));

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes checkout.session.completed event for one-time payment', async () => {
    // Create mock request
    const req = new Request('https://example.com/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    
    // Check that user was created/updated
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      update: {},
      create: { email: 'test@example.com' },
    });
    
    // Check that credits were added
    expect(prisma.credits.upsert).toHaveBeenCalled();
    
    // Check that payment was recorded
    expect(prisma.paymentHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_123',
        stripeSessionId: 'cs_test_123',
        amount: 500,
        status: 'completed',
        type: 'one-time',
      }),
    });
  });

  // Additional tests could be added for other event types
});