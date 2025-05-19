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
echo "┃                       GhostTools Vercel Deployment                        ┃"
echo "┃                Deploy your AI content creation platform to Vercel         ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

# Check if Vercel CLI is installed
echo -e "${BLUE}Checking for Vercel CLI...${NC}"
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing now...${NC}"
    npm install -g vercel
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}Failed to install Vercel CLI. Please install it manually with 'npm install -g vercel'.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}Vercel CLI is installed.${NC}"

# Check if user is logged in to Vercel
echo -e "${BLUE}Checking Vercel login status...${NC}"
VERCEL_TOKEN=$(vercel whoami 2>/dev/null || echo "")
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${YELLOW}You're not logged in to Vercel. Please log in:${NC}"
    vercel login
fi
echo -e "${GREEN}Logged in to Vercel.${NC}"

# Check if git is initialized and has a remote
echo -e "${BLUE}Checking git setup...${NC}"
if [ ! -d .git ]; then
    echo -e "${YELLOW}Git repository not initialized. Initializing now...${NC}"
    git init
    git add .
    git commit -m "Initial commit for Vercel deployment"
fi

# Check if there's a remote repository
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE_URL" ]; then
    echo -e "${YELLOW}No remote repository found.${NC}"
    echo -e "${YELLOW}Would you like to create a GitHub repository? (y/n)${NC}"
    read CREATE_GITHUB
    
    if [[ "$CREATE_GITHUB" == "y" || "$CREATE_GITHUB" == "Y" ]]; then
        if ! command -v gh &> /dev/null; then
            echo -e "${RED}GitHub CLI not found. Please install it or manually create a GitHub repository.${NC}"
            echo -e "${RED}Visit: https://github.com/new to create a repository.${NC}"
            echo -e "${YELLOW}Please enter your GitHub repository URL (or press Enter to skip):${NC}"
            read GITHUB_URL
            
            if [ -n "$GITHUB_URL" ]; then
                git remote add origin "$GITHUB_URL"
                git push -u origin main || git push -u origin master
            fi
        else
            echo -e "${YELLOW}Creating GitHub repository...${NC}"
            gh repo create ghosttools --private --source=. --push
        fi
    fi
fi

# Load environment variables
echo -e "${BLUE}Loading environment variables from .env.local...${NC}"
if [ ! -f .env.local ]; then
    echo -e "${RED}.env.local file not found. Please run setup.sh first.${NC}"
    exit 1
fi

# Deploy to Vercel
echo -e "${BLUE}Deploying to Vercel...${NC}"
echo -e "${YELLOW}Would you like to deploy as a new project or link to an existing project? (new/existing)${NC}"
read DEPLOY_TYPE

if [[ "$DEPLOY_TYPE" == "new" || "$DEPLOY_TYPE" == "NEW" ]]; then
    echo -e "${YELLOW}Deploying as a new project...${NC}"
    vercel --prod
else
    echo -e "${YELLOW}Linking to an existing project...${NC}"
    vercel link
    vercel --prod
fi

# Setup complete
echo -e "${BLUE}"
echo "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓"
echo "┃                           Deployment Complete!                            ┃"
echo "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛"
echo -e "${NC}"

echo -e "${GREEN}GhostTools has been successfully deployed to Vercel!${NC}"
echo ""
echo -e "${YELLOW}Important Next Steps:${NC}"
echo ""
echo -e "1. ${BLUE}Configure a production database:${NC}"
echo -e "   - Set up a PostgreSQL database on Vercel, Supabase, or another provider"
echo -e "   - Add the DATABASE_URL environment variable in the Vercel dashboard"
echo ""
echo -e "2. ${BLUE}Set up Stripe webhooks:${NC}"
echo -e "   - Create a webhook endpoint in your Stripe dashboard"
echo -e "   - Point it to: https://your-domain.vercel.app/api/stripe/webhook"
echo -e "   - Add these events: checkout.session.completed, customer.subscription.created,"
echo -e "     customer.subscription.updated, customer.subscription.deleted"
echo ""
echo -e "3. ${BLUE}Configure authentication:${NC}"
echo -e "   - Set up OAuth providers (Google, etc.) for your production domain"
echo -e "   - Configure email provider for magic link authentication"
echo ""
echo -e "4. ${BLUE}Test the application:${NC}"
echo -e "   - Visit your deployment URL and test all features"
echo -e "   - Try creating subscriptions and processing payments"
echo ""
echo -e "${BLUE}Your Vercel deployment URL is shown above.${NC}"
echo -e "${BLUE}Happy selling!${NC}"