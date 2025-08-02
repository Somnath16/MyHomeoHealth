#!/bin/bash

# My Homeo Health - Quick Setup Script (Non-interactive)
# For advanced users who want minimal prompts

set -e

echo "🏥 My Homeo Health - Quick Setup"
echo "==============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js not found. Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$MAJOR_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ required. Current: $NODE_VERSION"
    exit 1
fi

print_status "Node.js $NODE_VERSION"

# Install dependencies
print_info "Installing dependencies..."
npm install
print_status "Dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_status ".env created from template"
    
    # Generate session secret
    if command -v openssl >/dev/null 2>&1; then
        SESSION_SECRET=$(openssl rand -hex 32)
        sed -i.bak "s/your-secure-session-secret-key-here/$SESSION_SECRET/" .env
        rm .env.bak 2>/dev/null || true
        print_status "Session secret generated"
    fi
    
    print_warning "Please edit .env with your configuration:"
    print_info "  - DATABASE_URL: Your PostgreSQL connection"
    print_info "  - GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey"
else
    print_status ".env already exists"
fi

# Make scripts executable
chmod +x setup.sh 2>/dev/null || true
chmod +x docker-setup.sh 2>/dev/null || true

print_status "Setup completed!"
print_info "Next steps:"
print_info "1. Edit .env with your configuration"
print_info "2. Run 'npm run db:push' to setup database"
print_info "3. Run 'npm run dev' to start development"
print_info ""
print_info "Login: admin/admin123 or ranajit/ranajit123"