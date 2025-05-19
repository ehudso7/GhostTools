import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { getToken } from 'next-auth/jwt';
import { env } from './env-validation';
import { applyRateLimit } from './rate-limit';

/**
 * Standard API error types for consistent error handling
 */
export enum ErrorType {
  VALIDATION = 'validation_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit_exceeded',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  INTERNAL_ERROR = 'internal_server_error',
  BAD_REQUEST = 'bad_request',
}

/**
 * Standard API error response format
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: Record<string, any>;
  code?: string;
}

/**
 * Options for configuring API handler wrapper
 */
export interface ApiHandlerOptions<T> {
  schema?: ZodSchema<T>;
  requireAuth?: boolean;
  rateLimitOptions?: {
    limit: number;
    windowMs: number;
  };
  cors?: boolean;
}

/**
 * Standard API success response
 */
export function successResponse(data: any, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Standard API error response
 */
export function errorResponse(error: ApiError, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError) {
  const details = error.errors.reduce((acc, curr) => {
    const path = curr.path.join('.');
    acc[path] = curr.message;
    return acc;
  }, {} as Record<string, string>);
  
  return errorResponse(
    {
      type: ErrorType.VALIDATION,
      message: 'Invalid request data',
      details,
    },
    400
  );
}

/**
 * API handler wrapper that provides:
 * - Input validation with Zod
 * - Authentication checking
 * - Rate limiting
 * - Error handling
 * - CORS headers when needed
 */
export function apiHandler<T = unknown>(
  handler: (req: NextRequest, data?: T, token?: any) => Promise<NextResponse>,
  options: ApiHandlerOptions<T> = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Add CORS headers if needed
    const corsHeaders = options.cors ? {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    } : {};
    
    // Handle preflight requests
    if (options.cors && req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    try {
      // Apply rate limiting if configured
      if (options.rateLimitOptions) {
        const { response, result } = applyRateLimit(req, options.rateLimitOptions);
        if (response) {
          return response;
        }
      }
      
      // Check authentication if required
      let token;
      if (options.requireAuth) {
        token = await getToken({ req, secret: env().NEXTAUTH_SECRET });
        if (!token) {
          return errorResponse({
            type: ErrorType.AUTHENTICATION,
            message: 'Authentication required',
          }, 401);
        }
      }
      
      // Parse and validate request data if schema provided
      let data: T | undefined;
      if (options.schema) {
        try {
          // For GET requests, parse query parameters
          if (req.method === 'GET') {
            const url = new URL(req.url);
            const queryParams = Object.fromEntries(url.searchParams.entries());
            data = options.schema.parse(queryParams);
          } else {
            // For other methods, parse body
            const body = await req.json().catch(() => ({}));
            data = options.schema.parse(body);
          }
        } catch (error) {
          if (error instanceof ZodError) {
            return handleValidationError(error);
          }
          throw error;
        }
      }
      
      // Call the handler with validated data and token
      const response = await handler(req, data, token);
      
      // Add CORS headers to the response if needed
      if (options.cors && response.headers) {
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    } catch (error: any) {
      console.error('API error:', error);
      
      // Handle known error types
      if (error.type && Object.values(ErrorType).includes(error.type)) {
        return errorResponse(error, error.status || 500);
      }
      
      // Handle unexpected errors
      return errorResponse({
        type: ErrorType.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        code: process.env.NODE_ENV === 'production' ? undefined : error.message,
      }, 500);
    }
  };
}