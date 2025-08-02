#!/bin/bash

# My Homeo Health - Quick Start Script
# For users who already have Node.js and PostgreSQL installed

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

main() {
    clear
    echo "================================================"
    echo "   My Homeo Health - Quick Start Setup         "
    echo "================================================"
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"
    
    if ! command_exists psql; then
        print_error "PostgreSQL not found. Please install PostgreSQL first."
        exit 1
    fi
    
    PG_VERSION=$(psql --version)
    print_success "PostgreSQL: $PG_VERSION"
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
    
    # Check for existing .env.local
    if [[ -f ".env.local" ]]; then
        print_status "Found existing .env.local file"
        read -p "Use existing configuration? (y/n): " use_existing
        if [[ ! $use_existing =~ ^[Yy]$ ]]; then
            rm .env.local
        fi
    fi
    
    # Create .env.local if it doesn't exist
    if [[ ! -f ".env.local" ]]; then
        print_status "Creating environment configuration..."
        
        # Get database details
        read -p "Database host (default: localhost): " DB_HOST
        DB_HOST=${DB_HOST:-localhost}
        
        read -p "Database port (default: 5432): " DB_PORT
        DB_PORT=${DB_PORT:-5432}
        
        read -p "Database name (default: homeo_health): " DB_NAME
        DB_NAME=${DB_NAME:-homeo_health}
        
        read -p "Database user: " DB_USER
        read -s -p "Database password: " DB_PASSWORD
        echo ""
        
        # Create .env.local
        cat > .env.local << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
PGHOST=$DB_HOST
PGPORT=$DB_PORT
PGDATABASE=$DB_NAME
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD
NODE_ENV=development
SESSION_SECRET=$(openssl rand -base64 32)
PORT=5000
VITE_API_URL=http://localhost:5000
EOF
        
        # Optional AI configuration
        echo ""
        read -p "Configure AI features? (y/n): " config_ai
        if [[ $config_ai =~ ^[Yy]$ ]]; then
            echo "Choose AI provider:"
            echo "1) Google Gemini"
            echo "2) OpenAI GPT"
            echo "3) Anthropic Claude"
            read -p "Enter choice (1-3): " ai_choice
            
            case $ai_choice in
                1)
                    read -p "Enter Gemini API Key: " api_key
                    echo "GEMINI_API_KEY=$api_key" >> .env.local
                    ;;
                2)
                    read -p "Enter OpenAI API Key: " api_key
                    echo "OPENAI_API_KEY=$api_key" >> .env.local
                    ;;
                3)
                    read -p "Enter Anthropic API Key: " api_key
                    echo "ANTHROPIC_API_KEY=$api_key" >> .env.local
                    ;;
            esac
        fi
        
        print_success "Environment configured"
    fi
    
    # Initialize database
    print_status "Initializing database..."
    source .env.local
    export DATABASE_URL
    npm run db:push || print_warning "Database setup will complete on first run"
    
    print_success "Quick setup complete!"
    echo ""
    echo "🌐 Server will run on: http://localhost:5000"
    echo "👤 Admin login: admin / admin123"
    echo "🩺 Doctor login: doctor / doctor123"
    echo ""
    
    read -p "Start the application now? (y/n): " start_now
    if [[ $start_now =~ ^[Yy]$ ]]; then
        print_status "Starting application..."
        npm run dev
    else
        print_success "Run 'npm run dev' to start the application"
    fi
}

trap 'echo -e "\n\n${RED}Setup interrupted${NC}"; exit 1' INT
main "$@"