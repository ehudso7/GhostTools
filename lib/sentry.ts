import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',
  });
}

// Custom error logger that works with or without Sentry
export function logError(error: any, context: Record<string, any> = {}) {
  console.error(error);
  
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  
  // You can also log to your own error tracking service or database here
}

// Utility to log user actions (for analytics)
export function logAction(action: string, data: Record<string, any> = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Action] ${action}:`, data);
  }
  
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: 'action',
      message: action,
      data,
      level: 'info',
    });
  }
}