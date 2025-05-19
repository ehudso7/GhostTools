import { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/prisma';

// Mock the prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
  checkDatabaseConnection: jest.fn(),
}));

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.OPENAI_API_KEY = 'sk-test-mock-key';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0-test';

describe('Health Check API', () => {
  // Create a mock request object
  const createRequest = () => {
    return new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status when everything is working', async () => {
    // Mock database connection success
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '1': 1 }]);
    
    // Call the health check endpoint
    const response = await GET(createRequest());
    const data = await response.json();
    
    // Assertions
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.version).toBe('1.0.0-test');
    expect(data.environment).toBe('test');
    expect(data.components.database.status).toBe('healthy');
    expect(data.components.stripe.status).toBe('healthy');
    expect(data.components.openai.status).toBe('healthy');
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.timestamp).toBe('string');
  });

  it('should return unhealthy status when database connection fails', async () => {
    // Mock database connection failure
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database connection failed'));
    
    // Call the health check endpoint
    const response = await GET(createRequest());
    const data = await response.json();
    
    // Assertions
    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.components.database.status).toBe('unhealthy');
  });

  it('should handle unexpected errors gracefully', async () => {
    // Mock unexpected error
    (prisma.$queryRaw as jest.Mock).mockImplementation(() => {
      throw new Error('Unexpected error');
    });
    
    // Call the health check endpoint
    const response = await GET(createRequest());
    const data = await response.json();
    
    // Assertions
    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Health check failed');
  });
});