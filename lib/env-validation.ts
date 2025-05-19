import { z } from 'zod';

/**
 * Environment schema validation ensures all required environment
 * variables are present and correctly typed before the application starts
 */
export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  
  // OAuth Providers (optional but validated if present)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Email Provider (optional but validated if present)
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // OpenAI API
  OPENAI_API_KEY: z.string().min(10),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_STARTER_PRICE_ID: z.string().startsWith('price_'),
  STRIPE_PRO_PRICE_ID: z.string().startsWith('price_'),
  
  // Credit packages (optional - for future implementation)
  STRIPE_CREDITS_20_PRICE_ID: z.string().startsWith('price_').optional(),
  STRIPE_CREDITS_50_PRICE_ID: z.string().startsWith('price_').optional(),
  STRIPE_CREDITS_100_PRICE_ID: z.string().startsWith('price_').optional(),
  
  // Rate Limiting - Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  // Affiliate Tracking
  REWARDFUL_API_KEY: z.string(),
  NEXT_PUBLIC_REWARDFUL_ID: z.string(),

  // Monitoring (optional)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  
  // Feature Flags
  ENABLE_PODSCRIBE: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
});

// Type for validated environment
export type Env = z.infer<typeof envSchema>;

// Singleton pattern to avoid re-parsing
let validated: Env | null = null;

/**
 * Validates all environment variables and returns a typed object
 * Throws detailed errors if any required variables are missing
 */
export function getValidatedEnv(): Env {
  if (validated) return validated;
  
  try {
    validated = envSchema.parse(process.env);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`- ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration. Check server logs for details.');
    }
    throw error;
  }
}

/**
 * Returns the validated environment variables
 * Should be used throughout the application instead of process.env
 */
export function env(): Env {
  return getValidatedEnv();
}