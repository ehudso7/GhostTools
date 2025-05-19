# GhostTools Production Handbook

This document outlines the production architecture, deployment procedures, and maintenance protocols for the GhostTools SaaS platform.

## System Architecture

GhostTools is a Next.js 14 application with the following core components:

1. **Frontend**: Next.js App Router with server components and client components
2. **Authentication**: NextAuth.js with email and OAuth providers
3. **Database**: PostgreSQL with Prisma ORM
4. **Payment Processing**: Stripe with webhooks for subscription management
5. **AI Integration**: OpenAI for content generation
6. **Monitoring**: Sentry for error tracking

### Stack Overview

```
Next.js 14 (Frontend & API) → PostgreSQL (Database)
                ↑
                ↓
    Stripe ← → OpenAI ← → Email
```

## Deployment Architecture

GhostTools is designed to be deployed as a serverless application on Vercel with a managed PostgreSQL database.

### Requirements

- Vercel account for hosting
- PostgreSQL database (Vercel Postgres, Neon, or Railway)
- Stripe account for payment processing
- OpenAI account for AI capabilities
- SMTP provider for email authentication
- Google OAuth credentials (optional)

## Environment Variables

The following environment variables must be configured in your production environment:

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment name | `production` |
| DATABASE_URL | PostgreSQL connection string | `postgresql://user:password@host:port/db` |
| NEXTAUTH_URL | Full URL of the application | `https://yourdomain.com` |
| NEXTAUTH_SECRET | JWT encryption secret | 32+ character string |
| OPENAI_API_KEY | OpenAI API key | `sk-...` |
| STRIPE_SECRET_KEY | Stripe secret key | `sk_live_...` |
| STRIPE_PUBLISHABLE_KEY | Stripe publishable key | `pk_live_...` |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret | `whsec_...` |
| STRIPE_STARTER_PRICE_ID | Stripe price ID for starter plan | `price_...` |
| STRIPE_PRO_PRICE_ID | Stripe price ID for pro plan | `price_...` |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST URL | `https://us1-abc-123.upstash.io` |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis auth token | `AYZ...` |
| REWARDFUL_API_KEY | Rewardful API key | `rewd_s3cr3tXXXXXXXXXXX` |
| NEXT_PUBLIC_REWARDFUL_ID | Rewardful public ID | `55cfdc` |
| NEXT_PUBLIC_BASE_URL | Public URL for the app | `https://yourdomain.com` |
| EMAIL_SERVER | SMTP server connection string | `smtp://user:pass@smtp.example.com:587` |
| EMAIL_FROM | From email address | `noreply@yourdomain.com` |
| NEXT_PUBLIC_SENTRY_DSN | Sentry DSN (optional) | `https://...@sentry.io/...` |

## Deployment Procedure

### Pre-Deployment Checklist

1. Run the production preparation script:
   ```bash
   ./scripts/prepare-production.sh
   ```

2. Verify all tests pass:
   ```bash
   npm test
   ```

3. Build the application locally to verify build succeeds:
   ```bash
   npm run build
   ```

4. Set up Stripe webhooks for the production environment
   - Create a webhook endpoint in Stripe dashboard pointing to `https://yourdomain.com/api/stripe/webhook`
   - Configure to listen to the following events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### Deployment Steps

1. Configure all environment variables in your deployment platform

2. Deploy to Vercel:
   ```bash
   ./deploy-vercel.sh
   ```
   
   Or use the Vercel dashboard for deployment.

3. After deployment, run the database migrations:
   ```bash
   npx prisma db push
   ```

4. Verify the deployment with the health check endpoint:
   ```bash
   curl https://yourdomain.com/api/health
   ```

### Post-Deployment Verification

1. Test authentication flow:
   - Email sign-in
   - OAuth sign-in (if configured)
   - Session persistence

2. Test Stripe integration:
   - One-time purchases
   - Subscription creation
   - Webhook processing

3. Test AI tools:
   - AgentWrite product description generation
   - PodScribe transcription (if enabled)

## Security Considerations

The platform implements several security measures:

1. **Content Security Policy (CSP)**: 
   - Implemented via `/lib/security.ts`
   - Controls which resources can be loaded

2. **Rate Limiting**:
   - API endpoints are protected by rate limiting
   - In production, this should be backed by Redis or similar distributed cache

3. **Authentication**:
   - JWT-based authentication with proper session management
   - Secure cookie handling

4. **Input Validation**:
   - All API inputs validated with Zod schemas
   - Prevents injection attacks

5. **Error Handling**:
   - Production errors are logged to Sentry
   - User-facing error messages don't leak sensitive information

## Database Management

### Migrations

Database schema changes should be managed through Prisma migrations:

```bash
# Generate a migration
npx prisma migrate dev --name descriptive_name

# Apply migrations in production
npx prisma migrate deploy
```

### Backups

Configure regular database backups in your database provider.

## Monitoring and Alerts

1. **Health Checks**:
   - The `/api/health` endpoint provides system status
   - Configure an external monitoring service to ping this endpoint

2. **Error Tracking**:
   - All errors are logged to Sentry
   - Configure appropriate notification thresholds

3. **Performance Monitoring**:
   - Vercel Analytics provides frontend performance metrics
   - Database query performance should be monitored separately

## Scaling Considerations

The application is designed for serverless deployment, but several components need special consideration for scaling:

1. **Rate Limiting**:
   - Production-grade rate limiting is implemented using Upstash Redis
   - Uses a sliding window algorithm for accurate limits across serverless functions
   - Configure appropriate limits in lib/rate-limit.ts for different API endpoints
   - Monitor Redis usage in the Upstash dashboard

2. **Database Connection Pooling**:
   - Configure connection limits appropriate for your database plan
   - Monitor connection usage as user base grows

3. **Webhook Processing**:
   - Stripe webhooks should be idempotent
   - Implement proper idempotency key handling for high-volume processing

## Maintenance Procedures

### Feature Deployment

1. Develop features on feature branches
2. Run the full test suite before merging
3. Merge to main branch
4. Deploy using the standard deployment procedure

### Emergency Fixes

For critical production issues:

1. Create a hotfix branch from the production tag
2. Implement and test the fix
3. Deploy directly to production after verification
4. Backport the fix to the main branch

## Troubleshooting

### Common Issues

1. **Webhook Processing Failures**:
   - Check Stripe dashboard for webhook delivery attempts
   - Verify webhook signature is correctly validated
   - Check for database connectivity issues

2. **Authentication Failures**:
   - Verify NEXTAUTH_URL matches actual deployment URL
   - Check email provider configuration
   - Verify database connectivity for session storage

3. **Rate Limiting Issues**:
   - Check Upstash Redis dashboard for rate limiting metrics
   - Verify Redis connection credentials are correct
   - Adjust rate limits based on actual usage patterns

## Contact Information

For urgent production issues, contact:

- Engineering: engineering@ghosttools.com
- DevOps: devops@ghosttools.com
- Security: security@ghosttools.com