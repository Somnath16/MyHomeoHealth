#!/bin/bash

# My Homeo Health - Docker Setup Script
# Sets up PostgreSQL using Docker for local development

set -e

# Colors
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
    echo "   My Homeo Health - Docker Setup              "
    echo "================================================"
    echo ""
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker not found. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
    
    COMPOSE_CMD="docker compose"
    if command_exists docker-compose; then
        COMPOSE_CMD="docker-compose"
    fi
    
    print_success "Docker and Docker Compose found"
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"
    
    # Create docker-compose.yml
    print_status "Creating Docker configuration..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: homeo-postgres
    environment:
      POSTGRES_DB: homeo_health
      POSTGRES_USER: homeo_user
      POSTGRES_PASSWORD: homeo_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U homeo_user -d homeo_health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
EOF
    
    # Start PostgreSQL container
    print_status "Starting PostgreSQL container..."
    $COMPOSE_CMD up -d postgres
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Verify connection
    for i in {1..30}; do
        if docker exec homeo-postgres pg_isready -U homeo_user -d homeo_health >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            print_error "PostgreSQL failed to start"
            exit 1
        fi
        echo -n "."
        sleep 2
    done
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"
    
    # Create .env.local
    print_status "Creating environment configuration..."
    cat > .env.local << EOF
DATABASE_URL=postgresql://homeo_user:homeo_password@localhost:5432/homeo_health
PGHOST=localhost
PGPORT=5432
PGDATABASE=homeo_health
PGUSER=homeo_user
PGPASSWORD=homeo_password
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
    
    # Initialize database
    print_status "Initializing database..."
    source .env.local
    export DATABASE_URL
    npm run db:push || print_warning "Database setup will complete on first run"
    
    print_success "Docker setup complete!"
    echo ""
    echo "================================================"
    echo "             SETUP COMPLETE!                    "
    echo "================================================"
    echo ""
    echo "📊 Database: PostgreSQL (Docker container)"
    echo "🌐 Server will run on: http://localhost:5000"
    echo "👤 Admin login: admin / admin123"
    echo "🩺 Doctor login: doctor / doctor123"
    echo ""
    echo "Docker commands:"
    echo "  Start database: $COMPOSE_CMD up -d"
    echo "  Stop database: $COMPOSE_CMD down"
    echo "  View logs: $COMPOSE_CMD logs postgres"
    echo ""
    
    read -p "Start the application now? (y/n): " start_now
    if [[ $start_now =~ ^[Yy]$ ]]; then
        print_status "Starting application..."
        npm run dev
    else
        print_success "Run 'npm run dev' to start the application"
        echo "Don't forget to start Docker containers: $COMPOSE_CMD up -d"
    fi
}

trap 'echo -e "\n\n${RED}Setup interrupted${NC}"; exit 1' INT
main "$@"