import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from './env-validation';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  identifierFn?: (req: NextRequest) => string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// Initialize Redis client for production use
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: env().UPSTASH_REDIS_REST_URL,
      token: env().UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

function getRateLimiter(options: RateLimitOptions): Ratelimit {
  if (!ratelimit) {
    const windowSeconds = Math.ceil(options.windowMs / 1000);
    
    ratelimit = new Ratelimit({
      redis: getRedisClient(),
      limiter: Ratelimit.slidingWindow(options.limit, `${windowSeconds}s`),
      analytics: true,
      prefix: 'ghosttools_ratelimit',
    });
  }
  return ratelimit;
}

export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  // Use custom identifier function or default to IP
  const identifier = options.identifierFn 
    ? options.identifierFn(req) 
    : req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
  
  const key = `${identifier}`;
  const limiter = getRateLimiter(options);
  const now = Date.now();
  
  // Apply rate limiting
  const { success, reset, limit, remaining } = await limiter.limit(key);
  
  return {
    success,
    limit,
    remaining,
    reset: now + ((reset - Math.floor(now / 1000)) * 1000),
  };
}

export async function applyRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<{ response: NextResponse | null; result: RateLimitResult }> {
  const result = await rateLimit(req, options);
  
  if (!result.success) {
    const response = NextResponse.json(
      { 
        success: false, 
        error: {
          type: 'rate_limit_exceeded',
          message: 'Rate limit exceeded. Please try again later.'
        } 
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': Math.floor((result.reset - Date.now()) / 1000).toString(),
        }
      }
    );
    
    return { response, result };
  }
  
  return { response: null, result };
}