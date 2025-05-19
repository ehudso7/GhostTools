import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from './env-validation';

/**
 * Content Security Policy directive
 * This controls which resources the browser is allowed to load
 */
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://analytics.google.com https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.stripe.com https://avatars.githubusercontent.com https://lh3.googleusercontent.com;
  font-src 'self';
  connect-src 'self' https://vitals.vercel-insights.com https://*.stripe.com https://api.openai.com https://${env().NEXTAUTH_URL.replace('https://', '')};
  frame-src https://js.stripe.com https://hooks.stripe.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

/**
 * Security headers for all responses
 */
const securityHeaders = [
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy,
  },
  // XSS Protection
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Content Type Options
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Frame Options
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Referrer Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions Policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Strict Transport Security
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/**
 * Add security headers to an API response
 */
export function addSecurityHeaders(req: NextRequest, response: NextResponse): NextResponse {
  const newHeaders = new Headers(response.headers);
  
  // Add all security headers
  securityHeaders.forEach(({ key, value }) => {
    newHeaders.set(key, value);
  });
  
  // Return a new response with the updated headers
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Check if a request should skip adding security headers
 * Useful for static assets, etc.
 */
export function shouldSkipSecurityHeaders(pathname: string): boolean {
  // Skip for static assets
  return pathname.startsWith('/_next/') || 
    pathname.includes('favicon.ico') ||
    pathname.match(/\.(jpg|jpeg|gif|png|svg|webp|css|js|woff|woff2|ttf|eot)$/i) !== null;
}

/**
 * Get CORS headers for specific API routes that need CORS
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  // In production, be more restrictive with allowed origins
  const allowedOrigin = process.env.NODE_ENV === 'production'
    ? env().NEXT_PUBLIC_BASE_URL
    : origin || '*';
    
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}