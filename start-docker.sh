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
echo "┃                       GhostTools Docker Startup                           ┃"
echo "┃                Run your AI content creation platform with Docker          ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

# Check if Docker is installed
echo -e "${BLUE}Checking for Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}Docker is installed.${NC}"

# Check if docker-compose is installed
echo -e "${BLUE}Checking for Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}Docker Compose is installed.${NC}"

# Check if .env.local exists and load environment variables
echo -e "${BLUE}Checking for environment variables...${NC}"
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}.env.local file not found. Creating a temporary one for Docker...${NC}"
    echo "Creating .env file for Docker..."
    
    # Generate a random string for NextAuth secret
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # Ask for environment variables
    echo -e "${YELLOW}Please enter your OpenAI API Key:${NC}"
    read OPENAI_API_KEY
    
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
    
    echo -e "${YELLOW}Please enter your Rewardful API Key (or press Enter to skip):${NC}"
    read REWARDFUL_API_KEY
    
    # Create .env file for Docker
    cat > .env << EOL
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
OPENAI_API_KEY=${OPENAI_API_KEY}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
STRIPE_PRICE_ID_STARTER=${STRIPE_PRICE_ID_STARTER}
STRIPE_PRICE_ID_PRO=${STRIPE_PRICE_ID_PRO}
REWARDFUL_API_KEY=${REWARDFUL_API_KEY}
EOL
else
    echo -e "${GREEN}.env.local file found. Extracting variables for Docker...${NC}"
    # Extract required variables from .env.local
    grep "NEXTAUTH_SECRET\|OPENAI_API_KEY\|STRIPE_SECRET_KEY\|NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\|STRIPE_WEBHOOK_SECRET\|STRIPE_PRICE_ID_STARTER\|STRIPE_PRICE_ID_PRO\|REWARDFUL_API_KEY" .env.local > .env
fi

echo -e "${GREEN}Environment variables prepared for Docker.${NC}"

# Build and start Docker containers
echo -e "${BLUE}Building and starting Docker containers...${NC}"
docker-compose up -d --build

echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                           Docker Started!                                 ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${GREEN}GhostTools is now running in Docker!${NC}"
echo -e "${YELLOW}You can access the application at: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Useful Docker commands:${NC}"
echo -e "  docker-compose logs -f         # View logs"
echo -e "  docker-compose down            # Stop containers"
echo -e "  docker-compose restart         # Restart containers"
echo ""
echo -e "${BLUE}Happy coding!${NC}"