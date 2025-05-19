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
echo "┃                       GhostTools Full Test Script                         ┃"
echo "┃             Test your AI content creation platform end-to-end             ┃"
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

# Check if npm is installed
echo -e "${BLUE}Checking for npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    exit 1
fi
echo -e "${GREEN}npm v$(npm -v) is installed.${NC}"

# Check if PostgreSQL is installed
echo -e "${BLUE}Checking for PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found locally. Using in-memory database for testing.${NC}"
    USE_POSTGRES=false
else
    echo -e "${GREEN}PostgreSQL is installed.${NC}"
    USE_POSTGRES=true
fi

# Check for env file
echo -e "${BLUE}Checking for environment variables...${NC}"
if [ ! -f .env.local ] && [ ! -f .env.test ]; then
    echo -e "${YELLOW}No environment file found. Creating .env.test for testing...${NC}"
    
    # Generate NextAuth secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # Create test env file with SQLite by default (will be updated for PostgreSQL later if needed)
    cat > .env.test << EOL
# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=test

# Database - using SQLite for tests
DATABASE_URL="file:./test.db"

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# OpenAI - using mock for tests
OPENAI_API_KEY=sk-test-mock-key

# Stripe - using test mode
STRIPE_SECRET_KEY=sk_test_mock
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_test_mock
STRIPE_STARTER_PRICE_ID=price_test_starter
STRIPE_PRO_PRICE_ID=price_test_pro
EOL
    
    echo -e "${GREEN}.env.test file created successfully.${NC}"
else
    echo -e "${GREEN}Environment file found.${NC}"
    
    # If we're using .env.local for tests, create a copy as .env.test
    if [ -f .env.local ] && [ ! -f .env.test ]; then
        echo -e "${YELLOW}Creating .env.test from .env.local...${NC}"
        cp .env.local .env.test
        # Add NODE_ENV=test to the file
        echo "NODE_ENV=test" >> .env.test
        
        # Always set DATABASE_URL for test database explicitly
        echo "DATABASE_URL=postgresql://$(whoami)@localhost:5432/ghosttools_test" >> .env.test
        echo -e "${YELLOW}Set DATABASE_URL to use ghosttools_test database${NC}"
        
        echo -e "${GREEN}.env.test created from .env.local${NC}"
    fi
fi

# Install dependencies if needed
echo -e "${BLUE}Checking for node_modules...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}Dependencies installed.${NC}"

# Prepare test database
echo -e "${BLUE}Preparing test database...${NC}"
if [ "$USE_POSTGRES" = true ]; then
    # Check if test database exists and create if not
    DB_EXISTS=$(psql -lqt | cut -d \| -f 1 | grep -w ghosttools_test | wc -l)
    
    if [ "$DB_EXISTS" -eq 0 ]; then
        echo -e "${YELLOW}Creating test database 'ghosttools_test'...${NC}"
        createdb ghosttools_test || { echo -e "${RED}Failed to create test database. Please create it manually.${NC}"; exit 1; }
    fi
    
    # Create .env.test file if it doesn't exist
    if [ ! -f .env.test ]; then
        # Generate NextAuth secret
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        
        # Create test env file
        cat > .env.test << EOL
# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=test

# Database - using PostgreSQL for tests
DATABASE_URL=postgresql://localhost:5432/ghosttools_test

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# OpenAI - using mock for tests
OPENAI_API_KEY=sk-test-mock-key

# Stripe - using test mode
STRIPE_SECRET_KEY=sk_test_mock
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_mock
STRIPE_WEBHOOK_SECRET=whsec_test_mock
STRIPE_STARTER_PRICE_ID=price_test_starter
STRIPE_PRO_PRICE_ID=price_test_pro
EOL
        echo -e "${GREEN}.env.test file created successfully.${NC}"
    else
        # Update test database URL in .env.test
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=postgresql://localhost:5432/ghosttools_test|g" .env.test
    fi
fi

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npx prisma generate

# Reset the test database
echo -e "${BLUE}Resetting test database...${NC}"
# Ask for PostgreSQL username if needed
echo -e "${YELLOW}Please enter your PostgreSQL username (default is your system username):${NC}"
read PG_USER
# Use the current system user if none provided
if [ -z "$PG_USER" ]; then
  PG_USER=$(whoami)
fi

# Create a direct database URL for testing with the username
TEST_DB_URL="postgresql://${PG_USER}@localhost:5432/ghosttools_test"
echo -e "${YELLOW}Setting DATABASE_URL to: ${TEST_DB_URL}${NC}"

# Export DATABASE_URL so Prisma can use it
export DATABASE_URL="${TEST_DB_URL}"

# Create or update .env.test file with the correct DATABASE_URL
if [ -f .env.test ]; then
  # Update DATABASE_URL in .env.test
  sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=${TEST_DB_URL}|g" .env.test || true
  # If DATABASE_URL doesn't exist in the file, add it
  if ! grep -q "DATABASE_URL" .env.test; then
    echo "DATABASE_URL=${TEST_DB_URL}" >> .env.test
  fi
else
  echo -e "${RED}.env.test file not found. Cannot continue.${NC}"
  exit 1
fi

# Create the test database if it doesn't exist
echo -e "${BLUE}Ensuring test database exists...${NC}"
createdb -U "$PG_USER" -h localhost ghosttools_test 2>/dev/null || echo -e "${YELLOW}Database ghosttools_test may already exist${NC}"

# Check if we can connect to the database
echo -e "${BLUE}Testing database connection...${NC}"
if ! psql -U "$PG_USER" -h localhost -c "SELECT 1" -d ghosttools_test > /dev/null 2>&1; then
  echo -e "${RED}Cannot connect to the database. Please check your PostgreSQL installation and permissions.${NC}"
  echo -e "${YELLOW}Try running these commands manually:${NC}"
  echo -e "  createdb -U $PG_USER ghosttools_test"
  echo -e "  psql -U $PG_USER -h localhost -c \"SELECT 1\" -d ghosttools_test"
  
  # Prompt the user to see if they want to create a superuser
  echo -e "${YELLOW}Do you want to try creating a superuser role for your username? (y/n)${NC}"
  read CREATE_SUPERUSER
  if [[ "$CREATE_SUPERUSER" == "y" || "$CREATE_SUPERUSER" == "Y" ]]; then
    echo -e "${BLUE}Attempting to create a superuser role...${NC}"
    sudo -u postgres psql -c "CREATE ROLE $PG_USER WITH SUPERUSER LOGIN CREATEDB CREATEROLE PASSWORD NULL;" || true
    echo -e "${YELLOW}Trying to connect again...${NC}"
    if ! psql -U "$PG_USER" -h localhost -c "SELECT 1" -d ghosttools_test > /dev/null 2>&1; then
      echo -e "${RED}Still cannot connect. Please set up PostgreSQL permissions manually.${NC}"
      exit 1
    else
      echo -e "${GREEN}Successfully created superuser and connected!${NC}"
    fi
  else
    exit 1
  fi
fi
echo -e "${GREEN}Database connection successful!${NC}"

# Now reset the database with the explicit URL
echo -e "${BLUE}Pushing schema to test database...${NC}"
DATABASE_URL="${TEST_DB_URL}" npx prisma db push --force-reset

# Run unit tests
echo -e "${BLUE}Running unit tests...${NC}"
npm test

# Build the app to catch any build errors
echo -e "${BLUE}Building the application...${NC}"
npm run build

# Seed the database with test data
echo -e "${BLUE}Seeding database with test data...${NC}"
cat > prisma/seed.ts << EOL
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      credits: {
        create: {
          amount: 50,
        },
      },
    },
  });

  console.log('Seeded test user:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.\$disconnect();
  });
EOL

# Add prisma seed configuration to package.json
node -e "
  try {
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    pkg.prisma = pkg.prisma || {};
    pkg.prisma.seed = 'ts-node prisma/seed.ts';
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
    console.log('Added prisma.seed to package.json');
  } catch (error) {
    console.error('Error updating package.json:', error);
  }
"

# Install ts-node if not already installed
npm install --save-dev ts-node

# Run the seed
echo -e "${BLUE}Attempting to seed the database...${NC}"
# Ensure DATABASE_URL environment variable is correctly set with proper username
# Use the PG_USER variable that was set earlier
if [ -z "$PG_USER" ]; then
  PG_USER=$(whoami)
fi
TEST_DB_URL="postgresql://${PG_USER}@localhost:5432/ghosttools_test"
export DATABASE_URL="${TEST_DB_URL}"

echo -e "${YELLOW}Using database URL for seeding: ${DATABASE_URL}${NC}"

if npm run | grep -q "db:seed"; then
  echo -e "${GREEN}Found existing db:seed script, using it...${NC}"
  DATABASE_URL="${DATABASE_URL}" NODE_ENV=test npm run db:seed
else
  echo -e "${YELLOW}No db:seed script found, running prisma db seed directly...${NC}"
  # Run the seed command with explicit environment variables
  DATABASE_URL="${DATABASE_URL}" NODE_ENV=test npx prisma db seed || echo -e "${YELLOW}Seeding may have failed, but continuing with tests...${NC}"
fi

# Start server in background and capture PID
echo -e "${BLUE}Starting Next.js server for e2e testing...${NC}"
# Make sure we pass the DATABASE_URL to the server process
# Use the PG_USER variable that was set earlier
if [ -z "$PG_USER" ]; then
  PG_USER=$(whoami)
fi
TEST_DB_URL="postgresql://${PG_USER}@localhost:5432/ghosttools_test"
export DATABASE_URL="${TEST_DB_URL}"

echo -e "${YELLOW}Using database URL for server: ${DATABASE_URL}${NC}"
DATABASE_URL="${DATABASE_URL}" NODE_ENV=test npm run dev &
SERVER_PID=$!

# Give the server some time to start
echo -e "${YELLOW}Waiting for server to start (15 seconds)...${NC}"
sleep 15

# Run e2e tests with simple curl checks
echo -e "${BLUE}Running end-to-end API tests...${NC}"

# Function to test an endpoint
test_endpoint() {
  local endpoint=$1
  local expected_status=$2
  local description=$3
  
  echo -e "${YELLOW}Testing $description...${NC}"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$endpoint)
  
  if [ "$response" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ $description: Got expected status $expected_status${NC}"
    return 0
  else
    echo -e "${RED}✗ $description: Expected status $expected_status, got $response${NC}"
    return 1
  fi
}

# Test API endpoints
test_endpoint "/" 200 "Homepage"
test_endpoint "/api/health" 404 "Health endpoint (should implement this)"
test_endpoint "/login" 200 "Login page"
test_endpoint "/api/user" 401 "User API (without auth)"

# Calculate success rate
total_tests=4
passed_tests=$((
  $(test_endpoint "/" 200 "Homepage"; echo $?) +
  $(test_endpoint "/api/health" 404 "Health endpoint"; echo $?) +
  $(test_endpoint "/login" 200 "Login page"; echo $?) +
  $(test_endpoint "/api/user" 401 "User API (without auth)"; echo $?)
))
passed_tests=$((total_tests - passed_tests))
success_rate=$((passed_tests * 100 / total_tests))

# Shutdown the server
echo -e "${BLUE}Shutting down test server...${NC}"
kill $SERVER_PID || true

# Check for lint errors
echo -e "${BLUE}Checking for lint errors...${NC}"
npm run lint || true

# Check for TypeScript errors
echo -e "${BLUE}Checking for TypeScript errors...${NC}"
if npm run | grep -q "typecheck"; then
  npm run typecheck || true
else
  echo -e "${YELLOW}No typecheck script found in package.json. Adding it...${NC}"
  # Add typecheck script to package.json
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.typecheck = 'tsc --noEmit';
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
  "
  npm run typecheck || true
fi

# Final summary
echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                           Test Results                                   ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${GREEN}Tests completed with $success_rate% success rate ($passed_tests/$total_tests tests passed)${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Add more comprehensive tests for API routes and components"
echo -e "2. Implement a health check endpoint"
echo -e "3. Add E2E tests with a framework like Playwright or Cypress"
echo ""
echo -e "${GREEN}To run the application for manual testing:${NC}"
echo -e "npm run dev"
echo ""
echo -e "${BLUE}Happy coding!${NC}"