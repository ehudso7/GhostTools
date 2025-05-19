# GhostTools

GhostTools is a production-ready SaaS platform offering AI-powered tools to accelerate content creation workflows. The platform includes AgentWrite (AI product description generator) and PodScribe (podcast transcription and summarization), with more tools coming soon.

## Production Ready

GhostTools is now a fully production-grade application with:

- **Complete Authentication System** with email/social login
- **Database Integration** with PostgreSQL + Prisma
- **Dual Monetization Model** (per-use payments and subscriptions)
- **Affiliate Program** for referral revenue
- **Security Hardening** with input validation and rate limiting

## Features

- **AI Content Tools**
  - **AgentWrite**: Generate compelling product descriptions with AI
  - **PodScribe**: Transcribe and summarize podcast episodes with AI
  - More tools coming soon!

- **Modern Tech & Design**
  - Modern dashboard with usage metrics and tool cards
  - Responsive design that works on all devices
  - Fast, server-rendered pages with Next.js App Router

- **Monetization Suite**
  - Pay-per-use model ($5-7 per generation)
  - Monthly subscription plans (Starter: $9.99, Pro: $29.99)
  - Affiliate program with 20% commission on referrals

- **Backend Infrastructure**
  - Secure authentication with NextAuth.js
  - Database persistence with PostgreSQL
  - Stripe payment processing (one-time and recurring)
  - Webhook handlers for payment events
  - Credit system for usage tracking

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- PostgreSQL database
- Stripe account
- OpenAI API key
- Rewardful account (for affiliate program)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ehudso7/GhostTools.git
   cd GhostTools
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up the database:
   See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

4. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   # App
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/ghosttools
   
   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   EMAIL_SERVER=smtp://username:password@smtp.example.com:587
   EMAIL_FROM=noreply@ghosttools.com
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
   STRIPE_PRICE_ID_STARTER=price_your_starter_price_id
   STRIPE_PRICE_ID_PRO=price_your_pro_price_id
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Rewardful
   REWARDFUL_API_KEY=your_rewardful_api_key
   
   # Monitoring (Optional)
   SENTRY_DSN=your_sentry_dsn
   ```

5. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
/
├── app/                         # Next.js App Router
│   ├── account/                 # User account page
│   ├── agentwrite/              # AgentWrite page
│   ├── api/                     # API routes
│   │   ├── agentwrite/          # AgentWrite API
│   │   ├── auth/                # NextAuth routes
│   │   ├── podscribe/           # PodScribe API
│   │   ├── stripe/              # Stripe payment routes
│   │   └── user/                # User data routes
│   ├── auth/                    # Auth pages
│   ├── components/              # React components
│   ├── contexts/                # React contexts
│   ├── dashboard/               # Dashboard page
│   ├── podscribe/               # PodScribe page
│   ├── pricing/                 # Pricing page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── providers.tsx            # App providers
├── lib/                         # Utility functions
│   ├── openai.ts                # OpenAI integration
│   ├── prisma.ts                # Prisma client
│   ├── rate-limit.ts            # Rate limiting
│   └── security.ts              # Security headers
├── prisma/                      # Database
│   └── schema.prisma            # Database schema
├── public/                      # Static assets
├── .env.local                   # Environment variables
├── middleware.ts                # Next.js middleware
├── next.config.js               # Next.js config
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript config
```

## Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md): Database setup instructions
- [DEPLOYMENT.md](./DEPLOYMENT.md): Deployment guide
- [PRODUCTION_HANDBOOK.md](./PRODUCTION_HANDBOOK.md): Production architecture and procedures
- [ENHANCEMENTS.md](./ENHANCEMENTS.md): Summary of enhancements
- [PHASE_I_SUMMARY.md](./PHASE_I_SUMMARY.md): Phase I implementation summary
- [PHASE_II_OPTIONS.md](./PHASE_II_OPTIONS.md): Phase II planning options
- [CHANGELOG.md](./CHANGELOG.md): Version history and changes

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Testing

Run the test suite:

```bash
npm test
# or
yarn test
```

## Production Readiness

GhostTools includes a comprehensive production readiness suite that will identify and fix common issues to ensure your deployment is secure and robust.

```bash
# Run the full production readiness suite
./make-production-ready.sh

# For more granular control:

# 1. Identify production issues
./scripts/production-readiness.sh

# 2. Fix identified issues
./scripts/fix-production-issues.sh

# 3. Verify deployment readiness
./scripts/prepare-production.sh
```

The production readiness suite addresses:

- Environment variable validation and security
- Content Security Policy implementation
- Rate limiting for serverless environments
- Error handling improvements
- Stripe webhook security
- Database connection management
- API response standardization
- Mock/placeholder data removal

```bash
# Run the full production readiness suite (assessment + fixes)
./make-production-ready.sh

# Run only the assessment
./scripts/production-readiness.sh

# Apply fixes automatically
./scripts/fix-production-issues.sh
```

The production readiness suite addresses the following:

- Environment variable validation
- Security headers and CSP configuration
- Rate limiting for serverless environments
- Error handling for API routes
- Stripe webhook security
- Removal of mock/placeholder data
- OpenAI API error handling
- Database connection management

## Monetization Setup

### Stripe Products Configuration

1. **One-time purchases**:
   - AgentWrite: $5 per description
   - PodScribe: $7 per transcription

2. **Subscription plans**:
   - Starter Plan: $9.99/month for 20 uses
   - Pro Plan: $29.99/month for unlimited use

### Affiliate Program Setup

The platform uses [Rewardful](https://www.rewardful.com/) for affiliate tracking:
- Automatic Stripe integration
- 20% commission on referred subscriptions
- Unique referral links for each user

## Next Steps

Choose the next feature to implement:

1. **Implement retention engine** with email alerts and usage reminders
2. **Add analytics dashboard** for monitoring business metrics
3. **Develop the GhostBlog tool** for AI-powered blog post generation
4. **Build team accounts** for collaborative usage

## License

This project is proprietary and confidential.