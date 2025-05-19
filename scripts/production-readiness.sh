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
echo "┃             GhostTools Production Readiness Script                       ┃"
echo "┃             Make your AI content platform launch-ready                   ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${BLUE}Step 1: Running comprehensive linting and type checking...${NC}"
npm run lint
npm run typecheck

echo -e "${BLUE}Step 2: Validating database schema and migrations...${NC}"
npx prisma validate

echo -e "${BLUE}Step 3: Running unit tests...${NC}"
npm test

echo -e "${BLUE}Step 4: Checking for .env configuration...${NC}"
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found. Please create it using .env.example as a template.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 5: Checking for mock/placeholder data...${NC}"

# Function to check a file for placeholder data
check_file() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if grep -q "$pattern" "$file"; then
        echo -e "${YELLOW}⚠️  Found potential placeholder/mock data in $file: $description${NC}"
        return 1
    fi
    return 0
}

# Files to check for mock data
check_file "scripts/seed-mock-data.js" "test@example.com" "Test email in seed script"
check_file "app/api/stripe/webhook/route.ts" "mock_" "Mock Stripe IDs"
check_file "app/account/page.tsx" "mock" "Mock subscription data"
check_file "src/utils/stripe.ts" "!" "Non-null assertions without validation"

# Check for hardcoded credentials
echo -e "${BLUE}Step 6: Checking for hardcoded credentials or API keys...${NC}"
grep -r "sk_test_" --include="*.ts" --include="*.tsx" --include="*.js" .
grep -r "sk_live_" --include="*.ts" --include="*.tsx" --include="*.js" .
grep -r "API_KEY" --include="*.ts" --include="*.tsx" --include="*.js" .

echo -e "${BLUE}Step 7: Checking for proper error handling in API routes...${NC}"
grep -r "try {" --include="*.ts" --include="*.tsx" app/api

echo -e "${BLUE}Step 8: Building the application...${NC}"
npm run build

echo -e "${BLUE}Step 9: Running security scan...${NC}"
# Simple check for potential security issues
grep -r "eval(" --include="*.ts" --include="*.tsx" --include="*.js" .
grep -r "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx" .

echo -e "${BLUE}Step 10: Validating Content-Security-Policy setup...${NC}"
if grep -q "Content-Security-Policy" lib/security.ts; then
    echo -e "${GREEN}✓ Content-Security-Policy is configured${NC}"
else
    echo -e "${YELLOW}⚠️ Content-Security-Policy is not properly configured in lib/security.ts${NC}"
fi

echo -e "${BLUE}Step 11: Checking for comprehensive environment variable validation...${NC}"
if grep -q "validateEnv" lib/; then
    echo -e "${GREEN}✓ Environment validation exists${NC}"
else
    echo -e "${YELLOW}⚠️ No dedicated environment variable validation found${NC}"
fi

echo -e "${BLUE}Step 12: Validating rate limiting implementation...${NC}"
if grep -q "lru-cache" lib/rate-limit.ts; then
    echo -e "${YELLOW}⚠️ Using in-memory rate limiting (lru-cache) which won't work properly in a serverless/multi-instance environment${NC}"
fi

echo -e "${BLUE}Step 13: Checking Stripe webhook security...${NC}"
if grep -q "stripe.webhooks.constructEvent" app/api/stripe/webhook/route.ts; then
    echo -e "${GREEN}✓ Stripe webhook signature validation exists${NC}"
else
    echo -e "${RED}✗ Stripe webhook signature validation not found${NC}"
fi

echo -e "${BLUE}Step 14: Validating database connection handling...${NC}"
if grep -q "prisma.\$connect" lib/prisma.ts; then
    echo -e "${GREEN}✓ Explicit database connection management exists${NC}"
else
    echo -e "${YELLOW}⚠️ No explicit database connection management found${NC}"
fi

echo -e "${BLUE}Step 15: Checking for proper OpenAI API error handling...${NC}"
if grep -q "catch" lib/openai.ts; then
    echo -e "${GREEN}✓ OpenAI API error handling exists${NC}"
else
    echo -e "${YELLOW}⚠️ Potential lack of error handling for OpenAI API calls${NC}"
fi

echo -e "${BLUE}Step 16: Checking for proper error tracking integration...${NC}"
if grep -q "Sentry" lib/sentry.ts; then
    echo -e "${GREEN}✓ Error tracking is configured${NC}"
else
    echo -e "${YELLOW}⚠️ Error tracking may not be properly configured${NC}"
fi

echo -e "${BLUE}Step 17: Validating subscription and payment handling...${NC}"
if grep -q "stripe.subscriptions" app/api/stripe/subscribe/route.ts; then
    echo -e "${GREEN}✓ Subscription handling exists${NC}"
else
    echo -e "${YELLOW}⚠️ Subscription handling may be incomplete${NC}"
fi

echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                  Production Readiness Assessment                         ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "\n${YELLOW}This script has identified potential issues that should be addressed before production deployment.${NC}"
echo -e "Please review the output above and address any warnings or errors."