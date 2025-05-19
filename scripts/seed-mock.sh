#!/bin/bash
set -e

# Color codes for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}     GhostTools Mock Data Seeder     ${NC}"
echo -e "${BLUE}=====================================${NC}"

# We're now using Node.js directly with the JS version of the script
# No need for ts-node anymore

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Run the seed script
echo -e "${BLUE}Running mock data seeder...${NC}"
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/ghosttools"

# Check if database exists and create if not
if ! psql -lqt | cut -d \| -f 1 | grep -w ghosttools &> /dev/null; then
    echo -e "${YELLOW}Creating database 'ghosttools'...${NC}"
    createdb ghosttools
fi

# Run Prisma migrations if needed
echo -e "${BLUE}Ensuring database schema is up to date...${NC}"
npx prisma db push --force-reset
echo -e "${GREEN}Schema pushed to database${NC}"

# Run the seeder
echo -e "${BLUE}Seeding mock data...${NC}"
node scripts/seed-mock-data.js

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}     Mock data seeded successfully   ${NC}"
echo -e "${GREEN}=====================================${NC}"