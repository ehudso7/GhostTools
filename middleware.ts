import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { addSecurityHeaders, shouldSkipSecurityHeaders, getCorsHeaders } from './lib/security';
import { env } from './lib/env-validation';

// Protected paths that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/account',
  '/agentwrite',
  '/podscribe',
  '/api/user',
  '/api/agentwrite',
  '/api/podscribe',
];

// Auth paths that should redirect logged-in users to dashboard
const AUTH_PATHS = [
  '/auth/signin',
  '/auth/signup',
  '/auth/verify-request',
];

// API routes that should have CORS headers
const CORS_API_PATHS = [
  '/api/health',
];

/**
 * Determines if a path is protected and requires authentication
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Determines if a path is an auth path
 */
function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(path => pathname === path);
}

/**
 * Determines if CORS should be enabled for this path
 */
function shouldEnableCors(pathname: string): boolean {
  return CORS_API_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Middleware function that runs before every request
 * Handles:
 * 1. Authentication checks for protected routes
 * 2. Security headers for all responses
 * 3. CORS headers for API routes
 * 4. Redirects for authenticated users on auth pages
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets and specific paths
  if (shouldSkipSecurityHeaders(pathname)) {
    return NextResponse.next();
  }
  
  // Check authentication for protected paths
  if (isProtectedPath(pathname)) {
    const token = await getToken({ 
      req: request, 
      secret: env().NEXTAUTH_SECRET 
    });
    
    if (!token) {
      // Redirect to login page with return URL
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (isAuthPath(pathname)) {
    const token = await getToken({ 
      req: request, 
      secret: env().NEXTAUTH_SECRET 
    });
    
    if (token) {
      // Redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }
  
  // Add security headers to all responses
  let response = NextResponse.next();
  
  // Add security headers
  response = addSecurityHeaders(request, response);
  
  // Add CORS headers for API routes that need them
  if (shouldEnableCors(pathname)) {
    const origin = request.headers.get('origin') || '';
    const corsHeaders = getCorsHeaders(origin);
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Handle OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 204,
        headers: response.headers,
      });
    }
  }
  
  return response;
}

/**
 * Configure middleware to run on specific paths
 */
export const config = {
  // Run middleware on all routes except for static files and api routes that handle their own auth
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public/ folder
     * Include all API routes that should be protected
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/user/:path*',
    '/api/agentwrite/:path*',
    '/api/podscribe/:path*',
  ],
};