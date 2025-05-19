#!/bin/bash
set -e

# Color codes for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}   GhostTools Development Starter    ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check for the test user and create it if it doesn't exist
echo -e "${BLUE}Checking for test user...${NC}"

# Connect to the database and check if the test user exists
USER_EXISTS=$(psql -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = 'test@example.com';" ghosttools)

if [[ "$USER_EXISTS" =~ 0 ]]; then
  echo -e "${YELLOW}Test user not found. Running mock data script...${NC}"
  ./scripts/seed-mock.sh
else
  echo -e "${GREEN}Test user already exists.${NC}"
fi

# Display login information
echo -e "${YELLOW}"
echo "===================== TEST LOGIN INFO ====================="
echo "You can log in with the following credentials:"
echo "Email:    test@example.com"
echo "Password: [No password needed - using magic link]"
echo ""
echo "For immediate access in development, you can click the"
echo "\"Sign in\" button without entering an email."
echo "=========================================================="
echo -e "${NC}"

# Start the development server with login bypass enabled for easier testing
echo -e "${BLUE}Starting development server...${NC}"
echo -e "${GREEN}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the development server
NEXTAUTH_URL=http://localhost:3000 npm run dev