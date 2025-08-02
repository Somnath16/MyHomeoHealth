#!/bin/bash

# My Homeo Health - Quick Start Script
# For users who already have Node.js and PostgreSQL installed

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}My Homeo Health - Quick Start${NC}"
echo "=================================="
echo ""

# Check prerequisites
if ! command -v node >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Node.js not found. Please run ./setup.sh instead${NC}"
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Please run ./setup.sh instead${NC}"
    exit 1
fi

# Quick setup
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${BLUE}⚙️  Setting up environment...${NC}"
if [ ! -f .env.local ]; then
    cat > .env.local << EOF
DATABASE_URL=postgresql://postgres:password@localhost:5432/homeo_health
NODE_ENV=development
SESSION_SECRET=$(openssl rand -base64 32)
PORT=5000
EOF
    echo "📝 Created .env.local with default settings"
    echo "💡 Edit .env.local to customize database connection"
fi

echo -e "${BLUE}🗄️  Setting up database...${NC}"
npm run db:push 2>/dev/null || echo "⚠️  Database setup will complete after first run"

echo -e "${GREEN}✅ Quick setup complete!${NC}"
echo ""
echo "🚀 Starting application..."
echo "🌐 Open http://localhost:5000 in your browser"
echo ""

npm run dev