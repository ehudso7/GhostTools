#!/bin/bash
set -e

# Color codes for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃             GhostTools Production Readiness Suite                       ┃"
echo "┃             Complete Production Preparation                             ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

# Create/update the necessary files
echo -e "${BLUE}Stage 1: Creating production-ready files...${NC}"

# First run the scripts to make all necessary fixes
if [ -f "./scripts/fix-production-issues.sh" ]; then
  echo -e "${YELLOW}Running fix-production-issues.sh to implement core fixes...${NC}"
  ./scripts/fix-production-issues.sh
else
  echo -e "${RED}Error: fix-production-issues.sh not found. Please run:${NC}"
  echo -e "chmod +x scripts/fix-production-issues.sh"
  exit 1
fi

# Run linting and type checking
echo -e "${BLUE}Stage 2: Running code quality checks...${NC}"
npm run lint
npm run typecheck

# Run tests
echo -e "${BLUE}Stage 3: Running comprehensive test suite...${NC}"
npm test

# Build check
echo -e "${BLUE}Stage 4: Verifying production build...${NC}"
NODE_ENV=production npm run build

# Final production readiness check
echo -e "${BLUE}Stage 5: Running production readiness validation...${NC}"
if [ -f "./scripts/prepare-production.sh" ]; then
  ./scripts/prepare-production.sh
else
  echo -e "${RED}Error: prepare-production.sh not found. Please run:${NC}"
  echo -e "chmod +x scripts/prepare-production.sh"
  exit 1
fi

echo -e "${GREEN}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                  Production Ready! 🚀                                   ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${GREEN}GhostTools is now ready for production deployment.${NC}"
echo -e "See the ${BLUE}PRODUCTION_HANDBOOK.md${NC} for deployment instructions."
echo -e "To deploy to Vercel, run: ${YELLOW}./deploy-vercel.sh${NC}"