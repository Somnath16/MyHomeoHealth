#!/bin/bash

# My Homeo Health - Docker Setup Script
# Sets up the project with Docker and PostgreSQL container

set -e

echo "🏥 My Homeo Health - Docker Setup"
echo "================================="

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

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker not found. Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi

print_status "Docker is available"

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
print_info "Installing project dependencies..."
npm install
print_status "Dependencies installed"

# Generate database credentials
DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))" 2>/dev/null || echo "homeo_password_$(date +%s)")
SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "change-this-secure-secret-key")

print_info "Generated secure credentials"

# Stop existing containers if they exist
print_info "Stopping existing containers..."
docker stop homeo-postgres 2>/dev/null || true
docker rm homeo-postgres 2>/dev/null || true

# Start PostgreSQL container
print_info "Starting PostgreSQL container..."
docker run -d \
  --name homeo-postgres \
  -e POSTGRES_DB=homeo_health \
  -e POSTGRES_USER=homeo_user \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -p 5432:5432 \
  postgres:15

print_status "PostgreSQL container started"

# Wait for database to be ready
print_info "Waiting for database to be ready..."
sleep 5

for i in {1..30}; do
    if docker exec homeo-postgres pg_isready -U homeo_user -d homeo_health >/dev/null 2>&1; then
        print_status "Database is ready"
        break
    fi
    
    if [ $i -eq 30 ]; then
        print_error "Database failed to start within 30 seconds"
        exit 1
    fi
    
    sleep 1
done

# Create .env file
print_info "Creating environment configuration..."

cat > .env << EOF
# Database Configuration (Docker PostgreSQL)
DATABASE_URL=postgresql://homeo_user:$DB_PASSWORD@localhost:5432/homeo_health

# AI Configuration - Add your Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# Session Configuration
SESSION_SECRET=$SESSION_SECRET

# Server Configuration
PORT=5000
NODE_ENV=development

# Docker Database Settings
PGHOST=localhost
PGPORT=5432
PGUSER=homeo_user
PGPASSWORD=$DB_PASSWORD
PGDATABASE=homeo_health
EOF

print_status ".env file created"

# Setup database schema
print_info "Setting up database schema..."
if npm run db:push; then
    print_status "Database schema created successfully"
else
    print_error "Database schema setup failed"
    exit 1
fi

# Create start script
cat > start.sh << 'EOF'
#!/bin/bash

# My Homeo Health - Start Script
# Starts the database container and development server

echo "🏥 Starting My Homeo Health..."

# Start PostgreSQL if not running
if ! docker ps | grep -q homeo-postgres; then
    echo "Starting PostgreSQL container..."
    docker start homeo-postgres
    sleep 3
fi

# Check database connection
if ! docker exec homeo-postgres pg_isready -U homeo_user -d homeo_health >/dev/null 2>&1; then
    echo "❌ Database not ready"
    exit 1
fi

echo "✅ Database ready"
echo "🚀 Starting development server..."
echo "📱 Access the app at: http://localhost:5000"
echo ""
echo "Default credentials:"
echo "  Admin: admin / admin123"
echo "  Doctor: ranajit / ranajit123"
echo ""

# Start development server
npm run dev
EOF

chmod +x start.sh

print_status "Setup completed successfully!"
echo
print_info "Docker Setup Summary:"
print_info "- PostgreSQL container: homeo-postgres"
print_info "- Database: homeo_health"
print_info "- User: homeo_user"
print_info "- Port: 5432"
echo

print_warning "Next steps:"
print_info "1. Add your Gemini API key to .env file"
print_info "2. Run './start.sh' to start the application"
print_info "3. Or run 'npm run dev' directly"
echo

print_info "Container Management:"
print_info "- Stop: docker stop homeo-postgres"
print_info "- Start: docker start homeo-postgres"
print_info "- Remove: docker rm -f homeo-postgres"
echo

print_info "Get Gemini API key: https://makersuite.google.com/app/apikey"
echo

# Ask to start now
read -p "Start the application now? (Y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_info "Starting application..."
    ./start.sh
else
    print_info "Run './start.sh' when ready to start the application"
fi