import { NextResponse } from 'next/server';
import { GET } from '../api/user/route';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

// Mock modules
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('User API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 if no session exists', async () => {
    // Mock no session
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET({} as Request);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 if user not found', async () => {
    // Mock session but no user
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
    });
    
    // Mock prisma return null
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const response = await GET({} as Request);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('returns user data if authenticated and user exists', async () => {
    // Mock session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
    });
    
    // Mock user data
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      credits: { amount: 10 },
      subscriptions: [{
        status: 'active',
        planId: 'pro',
        endDate: new Date('2023-12-31'),
      }],
    };
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const response = await GET({} as Request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toMatchObject({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      credits: 10,
      subscription: {
        status: 'active',
        planId: 'pro',
      },
    });
  });
});