# GhostTools Installation Options

GhostTools provides multiple installation and deployment options to fit different workflows and environments. This document outlines all available options for setting up and deploying your AI content creation platform.

## Option 1: Local Development Setup

The easiest way to get started with GhostTools for development is to use our setup script.

### Using the Setup Script

```bash
# Make the script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

This script will:
1. Check prerequisites (Node.js, PostgreSQL)
2. Install dependencies
3. Set up environment variables
4. Initialize the database
5. Generate Prisma client
6. Create git repository (if needed)

After running the script, you can start the development server:

```bash
npm run dev
```

### Manual Setup

If you prefer to set up manually:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your database:
   - Create a PostgreSQL database
   - Update `.env.local` with your database URL

3. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Option 2: Docker Setup

GhostTools can be run using Docker for an isolated, containerized environment.

### Using Docker Compose

```bash
# Make the script executable
chmod +x start-docker.sh

# Run the Docker startup script
./start-docker.sh
```

This script will:
1. Check for Docker and Docker Compose installation
2. Create a Docker environment file
3. Build and start the Docker containers

The application will be available at http://localhost:3000.

### Manual Docker Setup

If you prefer to set up Docker manually:

1. Create a `.env` file with your environment variables
2. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```

## Option 3: Vercel Deployment

For production deployment, we recommend Vercel for its simplicity and excellent Next.js integration.

### Using the Deployment Script

```bash
# Make the script executable
chmod +x deploy-vercel.sh

# Run the deployment script
./deploy-vercel.sh
```

This script will:
1. Check for Vercel CLI installation
2. Log you in to Vercel (if needed)
3. Set up git (if needed)
4. Deploy your application to Vercel

### Manual Vercel Deployment

If you prefer to deploy manually:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the application:
   ```bash
   vercel --prod
   ```

## Option 4: Custom Deployment

GhostTools can be deployed to any platform that supports Node.js applications.

### Build for Production

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

### Environment Configuration

Regardless of your deployment option, you'll need to configure these environment variables:

```
# App
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@ghosttools.com

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
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

## Database Migration

When deploying to production, you should use migrations for database changes:

```bash
# Generate migration
npx prisma migrate dev --name init

# Apply migration in production
npx prisma migrate deploy
```

## Troubleshooting

If you encounter issues during installation or deployment:

1. Check the logs for detailed error messages
2. Verify environment variables are correctly set
3. Ensure database connection is working
4. Confirm API keys are valid
5. Check Stripe webhook configuration

For more detailed help, please refer to the documentation for each specific tool (Next.js, Prisma, Stripe, etc.).