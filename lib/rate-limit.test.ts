import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, applyRateLimit } from './rate-limit';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Mock the external Redis and Ratelimit modules
jest.mock('@upstash/redis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      customCommand: jest.fn(),
    })),
  };
});

jest.mock('@upstash/ratelimit', () => {
  const mockLimit = jest.fn();
  
  return {
    Ratelimit: {
      slidingWindow: jest.fn().mockImplementation(() => mockLimit),
      mockLimitFn: mockLimit,
    },
  };
});

// Mock the env function to avoid requiring real environment variables
jest.mock('./env-validation', () => ({
  env: jest.fn(() => ({
    UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'mock_token',
  })),
}));

describe('Rate Limiting', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock NextRequest
    mockRequest = {
      ip: '127.0.0.1',
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1',
      }),
    } as unknown as NextRequest;
    
    // Mock the Ratelimit.limit method implementation
    const mockLimit = Ratelimit.slidingWindow();
    const mockLimitSuccess = {
      success: true,
      limit: 10,
      remaining: 9,
      reset: Math.floor(Date.now() / 1000) + 60,
    };
    
    (Ratelimit as any).mockLimitFn.mockResolvedValue(mockLimitSuccess);
  });
  
  describe('rateLimit', () => {
    it('should create a rate limiter with correct options', async () => {
      const options = {
        limit: 10,
        windowMs: 60000,
      };
      
      await rateLimit(mockRequest, options);
      
      expect(Redis).toHaveBeenCalledWith({
        url: 'https://example.upstash.io',
        token: 'mock_token',
      });
      
      expect(Ratelimit.slidingWindow).toHaveBeenCalledWith(10, '60s');
    });
    
    it('should use custom identifier function if provided', async () => {
      const options = {
        limit: 10,
        windowMs: 60000,
        identifierFn: (req: NextRequest) => 'custom-id',
      };
      
      const result = await rateLimit(mockRequest, options);
      
      expect((Ratelimit as any).mockLimitFn).toHaveBeenCalledWith('custom-id');
      expect(result.success).toBe(true);
    });
    
    it('should return rate limit results', async () => {
      const options = {
        limit: 10,
        windowMs: 60000,
      };
      
      const resetTime = Math.floor(Date.now() / 1000) + 60;
      (Ratelimit as any).mockLimitFn.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: resetTime,
      });
      
      const result = await rateLimit(mockRequest, options);
      
      expect(result).toEqual(expect.objectContaining({
        success: true,
        limit: 10,
        remaining: 9,
        reset: expect.any(Number),
      }));
      
      // Reset time should be converted from seconds to milliseconds
      expect(result.reset).toBeGreaterThan(Date.now());
    });
  });
  
  describe('applyRateLimit', () => {
    it('should return null response when rate limit is not exceeded', async () => {
      const options = {
        limit: 10,
        windowMs: 60000,
      };
      
      (Ratelimit as any).mockLimitFn.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Math.floor(Date.now() / 1000) + 60,
      });
      
      const { response, result } = await applyRateLimit(mockRequest, options);
      
      expect(response).toBeNull();
      expect(result.success).toBe(true);
    });
    
    it('should return 429 response when rate limit is exceeded', async () => {
      const options = {
        limit: 10,
        windowMs: 60000,
      };
      
      (Ratelimit as any).mockLimitFn.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + 60,
      });
      
      const { response, result } = await applyRateLimit(mockRequest, options);
      
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
      
      const data = await response?.json();
      expect(data).toEqual({
        success: false,
        error: {
          type: 'rate_limit_exceeded',
          message: 'Rate limit exceeded. Please try again later.',
        },
      });
      
      // Headers should be set correctly
      expect(response?.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response?.headers.get('X-RateLimit-Reset')).toBeTruthy();
      expect(response?.headers.get('Retry-After')).toBeTruthy();
    });
  });
});