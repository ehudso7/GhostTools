import * as Sentry from '@sentry/nextjs';

// Initialize Sentry if not already initialized
export function initSentry() {
  if (!Sentry.Hub.isInitialized()) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });
  }
}

// Capture exception with additional context
export function captureException(error: unknown, context?: Record<string, any>) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.error('Error captured but Sentry DSN is not configured:', error);
    return;
  }

  try {
    initSentry();
    
    if (context) {
      Sentry.configureScope((scope) => {
        for (const [key, value] of Object.entries(context)) {
          scope.setExtra(key, value);
        }
      });
    }
    
    Sentry.captureException(error);
  } catch (e) {
    console.error('Failed to capture exception in Sentry:', e);
  }
}

// Set user information in Sentry scope
export function setUserContext(userId: string, email?: string, username?: string) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  
  try {
    initSentry();
    
    Sentry.configureScope((scope) => {
      scope.setUser({
        id: userId,
        email,
        username,
      });
    });
  } catch (e) {
    console.error('Failed to set user context in Sentry:', e);
  }
}

// Create a transaction for performance monitoring
export function startTransaction(name: string, op: string) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
  
  try {
    initSentry();
    
    return Sentry.startTransaction({
      name,
      op,
    });
  } catch (e) {
    console.error('Failed to start transaction in Sentry:', e);
    return null;
  }
}