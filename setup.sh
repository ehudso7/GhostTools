#!/bin/bash
set -e

# Color codes for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                          GhostTools Setup Script                          ┃"
echo "┃                   Initialize your AI content creation platform            ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

# Check if Node.js is installed
echo -e "${BLUE}Checking for Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js v18 or higher.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version is too old. Please install Node.js v18 or higher.${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js v$(node -v) is installed.${NC}"

# Check if PostgreSQL is installed
echo -e "${BLUE}Checking for PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found locally. You'll need to set up a database manually.${NC}"
    echo -e "${YELLOW}You can use a local installation or a cloud provider like Supabase, Neon, or Vercel Postgres.${NC}"
    DB_SETUP="manual"
else
    echo -e "${GREEN}PostgreSQL is installed.${NC}"
    DB_SETUP="local"
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Create .env.local file
echo -e "${BLUE}Setting up environment variables...${NC}"

# Ask for OpenAI API Key
echo -e "${YELLOW}Please enter your OpenAI API Key:${NC}"
read OPENAI_API_KEY

# Ask for Stripe API Keys
echo -e "${YELLOW}Please enter your Stripe Secret Key:${NC}"
read STRIPE_SECRET_KEY

echo -e "${YELLOW}Please enter your Stripe Publishable Key:${NC}"
read STRIPE_PUBLISHABLE_KEY

echo -e "${YELLOW}Please enter your Stripe Webhook Secret:${NC}"
read STRIPE_WEBHOOK_SECRET

echo -e "${YELLOW}Please enter your Stripe Price ID for Starter Plan:${NC}"
read STRIPE_PRICE_ID_STARTER

echo -e "${YELLOW}Please enter your Stripe Price ID for Pro Plan:${NC}"
read STRIPE_PRICE_ID_PRO

# Ask for Rewardful API Key
echo -e "${YELLOW}Please enter your Rewardful API Key (or press Enter to skip):${NC}"
read REWARDFUL_API_KEY

# Generate a random string for NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Ask for database URL if manual setup
if [ "$DB_SETUP" = "manual" ]; then
    echo -e "${YELLOW}Please enter your PostgreSQL Database URL:${NC}"
    echo -e "${YELLOW}Format: postgresql://username:password@hostname:port/database${NC}"
    read DATABASE_URL
else
    # Set up local PostgreSQL database
    echo -e "${BLUE}Setting up local PostgreSQL database...${NC}"
    
    # Check if ghosttools database exists
    DB_EXISTS=$(psql -lqt | cut -d \| -f 1 | grep -w ghosttools | wc -l)
    
    if [ "$DB_EXISTS" -eq 0 ]; then
        echo -e "${BLUE}Creating 'ghosttools' database...${NC}"
        createdb ghosttools || { echo -e "${RED}Failed to create database. You might need to create it manually.${NC}"; exit 1; }
    else
        echo -e "${GREEN}Database 'ghosttools' already exists.${NC}"
    fi
    
    # Set the database URL for local development
    DATABASE_URL="postgresql://localhost:5432/ghosttools"
    echo -e "${GREEN}Database URL set to: ${DATABASE_URL}${NC}"
fi

# Create .env.local file
cat > .env.local << EOL
# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=${DATABASE_URL}

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
# For production, set up these values:
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# EMAIL_SERVER=smtp://username:password@smtp.example.com:587
# EMAIL_FROM=noreply@ghosttools.com

# Stripe
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
STRIPE_PRICE_ID_STARTER=${STRIPE_PRICE_ID_STARTER}
STRIPE_PRICE_ID_PRO=${STRIPE_PRICE_ID_PRO}

# OpenAI
OPENAI_API_KEY=${OPENAI_API_KEY}

# Rewardful
REWARDFUL_API_KEY=${REWARDFUL_API_KEY}

# Uncomment for production:
# SENTRY_DSN=your_sentry_dsn
EOL

echo -e "${GREEN}.env.local file created successfully.${NC}"

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

# Push database schema
echo -e "${BLUE}Pushing database schema...${NC}"
npx prisma db push

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo -e "${BLUE}Creating .gitignore file...${NC}"
    cat > .gitignore << EOL
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOL
    echo -e "${GREEN}.gitignore file created.${NC}"
fi

# Initialize git repository if not already initialized
if [ ! -d .git ]; then
    echo -e "${BLUE}Initializing git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit - GhostTools setup"
    echo -e "${GREEN}Git repository initialized.${NC}"
fi

# Setup complete
echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                           Setup Complete!                                 ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${GREEN}GhostTools has been successfully set up!${NC}"
echo -e "${YELLOW}To start the development server:${NC}"
echo -e "  npm run dev"
echo ""
echo -e "${YELLOW}To run tests:${NC}"
echo -e "  npm test"
echo ""
echo -e "${YELLOW}For authentication setup:${NC}"
echo -e "  To enable Google sign-in, add your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local"
echo -e "  To enable email sign-in, add your EMAIL_SERVER and EMAIL_FROM to .env.local"
echo ""
echo -e "${YELLOW}For production deployment:${NC}"
echo -e "  See DEPLOYMENT.md for detailed instructions"
echo ""
echo -e "${BLUE}Happy coding!${NC}"