import { LRUCache } from 'lru-cache';
import { NextRequest } from 'next/server';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

// Create a new rate limiter with default options
export default function getRateLimiter(options: Options = {}) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000,
  });

  return {
    check: (request: NextRequest, limit: number, token: string) =>
      checkRateLimit(request, limit, token, tokenCache),
  };
}

async function checkRateLimit(
  request: NextRequest,
  limit: number,
  token: string,
  tokenCache: LRUCache<string, number>
) {
  const tokenCount = (tokenCache.get(token) as number) || 0;

  // Check if the token count exceeds the limit
  if (tokenCount >= limit) {
    return { success: false, limit, remaining: 0 };
  }

  // Update the token count
  tokenCache.set(token, tokenCount + 1);

  return { success: true, limit, remaining: limit - (tokenCount + 1) };
}

// Helper function to get client IP address
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  return 'unknown';
}