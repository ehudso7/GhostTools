import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Array of public routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', '/api/auth', '/api/stripe/webhook'];

// Array of API routes that don't require rate limiting
const openApiRoutes = ['/api/auth', '/api/stripe/webhook'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the request is for an API route that doesn't need auth
  const isOpenApiRoute = openApiRoutes.some(route => pathname.startsWith(route));
  
  // Check if the request is for a public route
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // For API routes that need auth
  if (pathname.startsWith('/api/') && !isOpenApiRoute) {
    // Add security headers for API routes
    const response = NextResponse.next();
    response.headers.set('Content-Security-Policy', "default-src 'self'");
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
  }
  
  // Static files and public routes don't need auth checks
  if (
    pathname.includes('.') || // Static files
    isPublicRoute ||
    pathname.startsWith('/_next') || 
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }
  
  // Check for auth token
  const token = await getToken({ req: request });
  
  // Redirect to login if no token found
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

// Specify which routes the middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
  ],
};