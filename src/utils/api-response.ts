import { NextResponse } from 'next/server';

type ErrorResponseType = {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
};

export function successResponse<T = any>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function errorResponse({ message, status = 400, errors }: ErrorResponseType) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        ...(errors && { errors }),
      },
    },
    { status }
  );
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse({ message, status: 401 });
}

export function forbiddenResponse(message = 'Forbidden') {
  return errorResponse({ message, status: 403 });
}

export function notFoundResponse(message = 'Not found') {
  return errorResponse({ message, status: 404 });
}

export function tooManyRequestsResponse(message = 'Too many requests') {
  return errorResponse({ message, status: 429 });
}

export function serverErrorResponse(message = 'Internal server error') {
  return errorResponse({ message, status: 500 });
}