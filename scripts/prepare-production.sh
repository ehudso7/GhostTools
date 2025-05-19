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
echo "┃             GhostTools Production Deployment Script                     ┃"
echo "┃             Prepare and validate for production deployment              ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

# Check that we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
  echo -e "${YELLOW}WARNING: You are not on the main branch. Current branch: ${CURRENT_BRANCH}${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment preparation aborted.${NC}"
    exit 1
  fi
fi

# Environment variable validation
echo -e "${BLUE}Step 1: Checking environment variables...${NC}"

check_env_file() {
  local env_file=$1
  local required_vars=(
    "DATABASE_URL"
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET" 
    "OPENAI_API_KEY"
    "STRIPE_SECRET_KEY"
    "STRIPE_PUBLISHABLE_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "STRIPE_STARTER_PRICE_ID"
    "STRIPE_PRO_PRICE_ID"
    "NEXT_PUBLIC_BASE_URL"
  )
  
  missing_vars=()
  
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "$env_file" && ! grep -q "^${var}=\"" "$env_file"; then
      missing_vars+=("$var")
    fi
  done
  
  if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: Missing required environment variables in ${env_file}:${NC}"
    for var in "${missing_vars[@]}"; do
      echo "  - $var"
    done
    return 1
  else
    echo -e "${GREEN}✓ All required environment variables found in ${env_file}${NC}"
    return 0
  fi
}

if [ -f ".env.production" ]; then
  check_env_file ".env.production"
else
  echo -e "${YELLOW}WARNING: No .env.production file found. Checking .env.local instead.${NC}"
  if [ -f ".env.local" ]; then
    check_env_file ".env.local"
  else
    echo -e "${RED}ERROR: No environment files found. Please create a .env.production file.${NC}"
    exit 1
  fi
fi

# Linting and type checking
echo -e "${BLUE}Step 2: Running linting and type checking...${NC}"
npm run lint
npm run typecheck

# Run tests
echo -e "${BLUE}Step 3: Running tests...${NC}"
npm test

# Check for mock/placeholder data
echo -e "${BLUE}Step 4: Checking for mock/placeholder data...${NC}"

# Files to check for mock data
mock_data_files=(
  "scripts/seed-mock-data.js"
  "app/api/stripe/webhook/route.ts"
  "app/account/page.tsx"
  "lib/stripe.ts"
)

mock_patterns=(
  "test@example.com"
  "mock_"
  "example.com"
  "EXAMPLE_"
  "TODO"
  "FIXME"
)

found_mock_data=false

for file in "${mock_data_files[@]}"; do
  if [ -f "$file" ]; then
    for pattern in "${mock_patterns[@]}"; do
      if grep -q "$pattern" "$file"; then
        echo -e "${YELLOW}WARNING: Found potential mock data '$pattern' in ${file}${NC}"
        found_mock_data=true
      fi
    done
  fi
done

# Wider search for mock data across more files
echo -e "${BLUE}Performing wider search for mock data...${NC}"
for pattern in "${mock_patterns[@]}"; do
  # Excluding node_modules and .git
  results=$(find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/scripts/prepare-production.sh" -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs grep -l "$pattern" 2>/dev/null || true)
  
  if [ -n "$results" ]; then
    echo -e "${YELLOW}WARNING: Found potential mock data '$pattern' in these files:${NC}"
    echo "$results" | sed 's/^/  - /'
    found_mock_data=true
  fi
done

if $found_mock_data; then
  echo -e "${YELLOW}⚠️ Mock data detected. Please review and remove before production deployment.${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment preparation aborted.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ No obvious mock data detected${NC}"
fi

# Build check
echo -e "${BLUE}Step 5: Testing production build...${NC}"
NODE_ENV=production npm run build

# Security check
echo -e "${BLUE}Step 6: Running security check...${NC}"

# Check for missing Content-Security-Policy
if ! grep -q "Content-Security-Policy" lib/security.ts; then
  echo -e "${RED}ERROR: Content-Security-Policy is not properly configured in lib/security.ts${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Content-Security-Policy is configured${NC}"
fi

# Check for environment variable validation
if ! grep -q "validateEnv\|envSchema" lib/env-validation.ts; then
  echo -e "${RED}ERROR: Environment variable validation may be missing${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Environment validation exists${NC}"
fi

# Check if Stripe webhook validation exists
if ! grep -q "stripe.webhooks.constructEvent" app/api/stripe/webhook/route.ts; then
  echo -e "${RED}ERROR: Stripe webhook signature validation is missing${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Stripe webhook signature validation exists${NC}"
fi

# Check for API error handling
echo -e "${BLUE}Step 7: Checking for proper API error handling...${NC}"
api_routes=$(find ./app/api -name "route.ts")
missing_error_handling=false

for route in $api_routes; do
  if ! grep -q "try {" "$route" && ! grep -q "apiHandler" "$route"; then
    echo -e "${YELLOW}WARNING: API route $route may be missing proper error handling${NC}"
    missing_error_handling=true
  fi
done

if $missing_error_handling; then
  echo -e "${YELLOW}⚠️ Some API routes may lack proper error handling. Review before deployment.${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment preparation aborted.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ API error handling appears to be in place${NC}"
fi

# Database check
echo -e "${BLUE}Step 8: Validating database schema...${NC}"
npx prisma validate

# Health check endpoint
echo -e "${BLUE}Step 9: Checking for health check endpoint...${NC}"
if [ ! -f "app/api/health/route.ts" ]; then
  echo -e "${YELLOW}WARNING: Health check endpoint is missing. Consider adding one for production monitoring.${NC}"
else
  echo -e "${GREEN}✓ Health check endpoint exists${NC}"
fi

# Final summary
echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                  Production Readiness Summary                           ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${GREEN}✓ Environment variables validated${NC}"
echo -e "${GREEN}✓ Linting and type checking passed${NC}"
echo -e "${GREEN}✓ Tests completed${NC}"
echo -e "${GREEN}✓ Production build successful${NC}"
echo -e "${GREEN}✓ Security configuration verified${NC}"
echo -e "${GREEN}✓ Database schema validated${NC}"

echo -e "\n${BLUE}Ready for deployment!${NC}"
echo -e "Use the following command to deploy:"
echo -e "${YELLOW}npm run deploy${NC} or ${YELLOW}./deploy-vercel.sh${NC}"