import { NextResponse } from 'next/server';
import { prisma, checkDatabaseConnection } from '@/lib/prisma';
import { env } from '@/lib/env-validation';

/**
 * Health check response structure
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  components: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
    stripe: {
      status: 'healthy' | 'unhealthy';
    };
    openai: {
      status: 'healthy' | 'unhealthy';
    };
  };
  uptime: number;
}

/**
 * Health check endpoint for monitoring the application status
 * GET /api/health
 */
export async function GET() {
  const startTime = Date.now();
  const healthCheck: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    components: {
      database: {
        status: 'unhealthy',
      },
      stripe: {
        status: 'unhealthy',
      },
      openai: {
        status: 'unhealthy',
      },
    },
    uptime: Math.floor(process.uptime()),
  };

  try {
    // Check database connection
    const dbStartTime = Date.now();
    const dbConnected = await checkDatabaseConnection();
    const dbEndTime = Date.now();
    
    healthCheck.components.database = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      latency: dbEndTime - dbStartTime,
    };
    
    // For simplicity, we just check if credentials are configured
    // In a production system, you might want to make lightweight API calls
    
    // Check Stripe credentials
    healthCheck.components.stripe = {
      status: env().STRIPE_SECRET_KEY.startsWith('sk_') ? 'healthy' : 'unhealthy',
    };
    
    // Check OpenAI credentials
    healthCheck.components.openai = {
      status: env().OPENAI_API_KEY.length > 10 ? 'healthy' : 'unhealthy',
    };
    
    // Determine overall status
    if (healthCheck.components.database.status === 'unhealthy') {
      healthCheck.status = 'unhealthy';
    } else if (
      healthCheck.components.stripe.status === 'unhealthy' ||
      healthCheck.components.openai.status === 'unhealthy'
    ) {
      healthCheck.status = 'degraded';
    }
    
    // Return appropriate status code
    return NextResponse.json(
      healthCheck,
      { 
        status: healthCheck.status === 'healthy' ? 200 : 
                healthCheck.status === 'degraded' ? 200 : 503
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Return error response
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      { status: 503 }
    );
  }
}