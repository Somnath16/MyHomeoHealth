#!/bin/bash

# My Homeo Health - Docker Setup Script
# Alternative setup using Docker containers

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}My Homeo Health - Docker Setup${NC}"
echo "====================================="
echo ""

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker not found${NC}"
    echo "Please install Docker Desktop:"
    echo "  Windows/Mac: https://www.docker.com/products/docker-desktop/"
    echo "  Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    if ! docker compose version >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker Compose not found${NC}"
        echo "Please install Docker Compose"
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Create docker-compose.yml
echo -e "${BLUE}📝 Creating Docker configuration...${NC}"
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: homeo_postgres
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

  app:
    build: .
    container_name: homeo_app
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://homeo_user:homeo_password@postgres:5432/homeo_health
      SESSION_SECRET: your_session_secret_change_this
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

volumes:
  postgres_data:
EOF

# Create Dockerfile
echo -e "${BLUE}🐳 Creating Dockerfile...${NC}"
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "run", "dev"]
EOF

# Create .dockerignore
cat > .dockerignore << 'EOF'
node_modules
.git
.env*
*.log
npm-debug.log*
.DS_Store
dist
build
EOF

# Ask for AI configuration
echo ""
read -p "Configure AI features? (y/N): " configure_ai
if [[ $configure_ai =~ ^[Yy]$ ]]; then
    echo "AI Providers:"
    echo "1) Google Gemini"
    echo "2) OpenAI GPT" 
    echo "3) Anthropic Claude"
    read -p "Choose (1-3): " ai_choice
    
    AI_ENV=""
    case $ai_choice in
        1)
            read -p "Gemini API Key: " api_key
            AI_ENV="GEMINI_API_KEY: $api_key"
            ;;
        2)
            read -p "OpenAI API Key: " api_key
            AI_ENV="OPENAI_API_KEY: $api_key"
            ;;
        3)
            read -p "Anthropic API Key: " api_key
            AI_ENV="ANTHROPIC_API_KEY: $api_key"
            ;;
    esac
    
    # Update docker-compose.yml with AI config
    if [ ! -z "$AI_ENV" ]; then
        sed -i "/SESSION_SECRET:/a\\      $AI_ENV" docker-compose.yml
    fi
fi

echo -e "${BLUE}🚀 Starting services...${NC}"
$COMPOSE_CMD up -d postgres

echo -e "${BLUE}⏳ Waiting for database...${NC}"
sleep 10

echo -e "${BLUE}📦 Building application...${NC}"
$COMPOSE_CMD build app

echo -e "${BLUE}🎯 Starting application...${NC}"
$COMPOSE_CMD up

echo -e "${GREEN}✅ Docker setup complete!${NC}"
echo ""
echo "🌐 Application: http://localhost:5000"
echo "🗄️  Database: localhost:5432"
echo ""
echo "Commands:"
echo "  Stop: $COMPOSE_CMD down"
echo "  Logs: $COMPOSE_CMD logs -f"
echo "  Shell: $COMPOSE_CMD exec app sh"