# GhostTools Deployment Guide

This guide outlines the steps to deploy GhostTools on Vercel and configure Stripe payments and the Rewardful affiliate program.

## Prerequisites

- A Stripe account with API keys
- A Vercel account
- A GitHub account
- OpenAI API key
- Rewardful account

## Deployment Steps

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial GhostTools MVP with AgentWrite, PodScribe, and Subscriptions"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Set up Stripe Products

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create products for each tool and subscription plan:
   
   **Pay-Per-Use Products**
   - **AgentWrite**
     - Name: `AgentWrite Credits`
     - Pricing: One-time $5
     - SKU: `agentwrite-5`
   
   - **PodScribe**
     - Name: `PodScribe Transcription`
     - Pricing: One-time $7
     - SKU: `podscribe-7`
   
   **Subscription Products**
   - **GhostTools Monthly – Starter**
     - Name: `GhostTools Monthly – Starter`
     - Pricing: Recurring $9.99/month
     - Price ID: Note this for .env as `STRIPE_PRICE_ID_STARTER`
   
   - **GhostTools Monthly – Pro**
     - Name: `GhostTools Monthly – Pro`
     - Pricing: Recurring $29.99/month
     - Price ID: Note this for .env as `STRIPE_PRICE_ID_PRO`

3. Get your API keys from the Stripe Dashboard
   - Stripe Secret Key (begins with `sk_`)
   - Stripe Publishable Key (begins with `pk_`)

### 3. Set up Stripe Webhooks

1. Go to the [Stripe Webhook Dashboard](https://dashboard.stripe.com/webhooks)
2. Add a new endpoint (you'll need your Vercel deployment URL):
   - URL: `https://your-app.vercel.app/api/stripe/webhook`
   - Events to listen for: 
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
3. Get your webhook secret (begins with `whsec_`)

### 4. Set up Rewardful

1. Sign up for [Rewardful](https://www.rewardful.com/)
2. Connect your Stripe account to Rewardful
3. Create a new campaign:
   - Set commission rate to 20%
   - Set cookie lifetime (typically 30 days)
   - Configure payout settings
4. Get your Rewardful API key for the .env file

### 5. Deploy on Vercel

1. Go to [Vercel](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - Framework preset: Next.js
   - Root directory: ./
4. Add environment variables:
   - `NEXT_PUBLIC_BASE_URL`: Your deployed app URL (e.g., https://ghost-tools.vercel.app)
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
   - `STRIPE_PRICE_ID_STARTER`: Your Stripe price ID for the Starter plan
   - `STRIPE_PRICE_ID_PRO`: Your Stripe price ID for the Pro plan
   - `REWARDFUL_API_KEY`: Your Rewardful API key
5. Deploy

### 6. Complete Stripe Webhook Setup

After deploying:

1. Go back to your Stripe webhook in the dashboard
2. Update the endpoint URL with your deployed app URL
3. Test the webhook to ensure it's working properly

## Testing the Deployment

1. Visit your deployed application
2. Test the one-time payment flow:
   - Navigate to AgentWrite or PodScribe
   - Click the payment button and complete a test payment
   - Verify the tool functionality after payment
   
3. Test the subscription flow:
   - Navigate to the Pricing page
   - Subscribe to a plan
   - Verify that you're redirected back to the dashboard with appropriate subscription status
   
4. Test the affiliate program:
   - Create a test affiliate link
   - Use it to visit the site in a different browser/incognito mode
   - Make a purchase with this referral link
   - Verify the referral shows up in Rewardful

## Performance Optimization

For production performance:

1. Enable Vercel's Edge Network caching
2. Consider setting up a Redis cache for frequently used OpenAI responses
3. Implement rate limiting to prevent API abuse

## Database Setup (Future Enhancement)

Currently, the application uses in-memory storage for simplicity. For production:

1. Set up a PostgreSQL database on Vercel or a service like Supabase
2. Create tables for users, credits, transactions, and usage
3. Update the webhook handler to store data in the database

## Monitoring and Analytics

1. Set up Vercel Analytics to track user interactions
2. Connect Google Analytics for detailed usage metrics
3. Configure error monitoring with Sentry or a similar tool
4. Set up Stripe dashboard alerts for subscription events

## Next Steps for Scaling

- Implement user authentication
- Add a real database for persistent storage
- Create an admin dashboard for monitoring subscriptions and affiliate commissions
- Set up email notifications for subscription events
- Develop additional tools to expand the platform