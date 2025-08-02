#!/bin/bash

# Local Development Fix Script for My Homeo Health
# This script addresses the WebSocket/database connection issues in local development

set -e

echo "🔧 My Homeo Health - Local Development Fix"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script fixes common local development issues:${NC}"
echo "1. WebSocket connection errors (ECONNREFUSED)"
echo "2. Port binding issues (ENOTSUP on port 5002)"
echo "3. Database driver configuration for local PostgreSQL"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cat > .env << EOL
# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/homeo_health

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || echo "change-this-in-production")

# Server Configuration
PORT=5000
NODE_ENV=development
EOL
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Update database URL if it contains neon.tech (cloud-specific)
if grep -q "neon.tech" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Detected cloud database URL. For local development, consider using:${NC}"
    echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/homeo_health"
    echo ""
    echo "Or use our Docker setup script for automatic database configuration:"
    echo "./docker-setup.sh"
    echo ""
fi

# Check if PostgreSQL is running locally
echo -e "${BLUE}Checking PostgreSQL status...${NC}"
if command -v pg_ctl &> /dev/null; then
    if pg_ctl status &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL not running. Start it with:${NC}"
        echo "  macOS (Homebrew): brew services start postgresql"
        echo "  Linux (systemd): sudo systemctl start postgresql"
        echo "  Or use Docker setup: ./docker-setup.sh"
    fi
elif command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL client found${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Consider using Docker setup:${NC}"
    echo "./docker-setup.sh"
fi

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Setting up database schema...${NC}"
if npm run db:push; then
    echo -e "${GREEN}✅ Database schema updated${NC}"
else
    echo -e "${YELLOW}⚠️  Database schema setup failed. Please check your DATABASE_URL${NC}"
    echo "Common solutions:"
    echo "1. Ensure PostgreSQL is running"
    echo "2. Create the database: createdb homeo_health"
    echo "3. Update DATABASE_URL in .env with correct credentials"
    echo "4. Use Docker setup: ./docker-setup.sh"
fi

echo ""
echo -e "${GREEN}🎉 Local development fix completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Update GEMINI_API_KEY in .env with your actual API key"
echo "2. Start the development server: npm run dev"
echo "3. Open http://localhost:5000 in your browser"
echo ""
echo "Default login credentials:"
echo "  Admin: admin / admin123"
echo "  Doctor: ranajit / ranajit123"
echo ""
echo "If you still encounter issues, check LOCAL_SETUP.md for detailed troubleshooting."