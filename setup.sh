#!/bin/bash

# My Homeo Health - Interactive Setup Script
# This script provides guided setup for local development

set -e

echo "🏥 My Homeo Health - Interactive Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_question() {
    echo -e "${CYAN}?${NC} $1"
}

# Welcome message
echo
print_info "This script will help you set up My Homeo Health for local development."
print_info "You'll need Node.js 18+, PostgreSQL, and a Gemini API key."
echo

# Check prerequisites
print_info "Checking prerequisites..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
    
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    print_info "Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm is not available"
    exit 1
fi

echo

# Install dependencies
print_info "Installing project dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

echo

# Database setup
print_question "Database Setup"
echo "Choose your database setup option:"
echo "1) Local PostgreSQL"
echo "2) Cloud Database (Neon, Supabase, etc.)"
echo "3) Skip database setup (configure later)"
echo

read -p "Enter your choice (1-3): " db_choice

DATABASE_URL=""

case $db_choice in
    1)
        echo
        print_info "Setting up local PostgreSQL connection..."
        
        if command -v psql >/dev/null 2>&1; then
            print_success "PostgreSQL client found"
            
            read -p "Database host (localhost): " db_host
            db_host=${db_host:-localhost}
            
            read -p "Database port (5432): " db_port
            db_port=${db_port:-5432}
            
            read -p "Database name (homeo_health): " db_name
            db_name=${db_name:-homeo_health}
            
            read -p "Database username: " db_user
            read -s -p "Database password: " db_password
            echo
            
            DATABASE_URL="postgresql://$db_user:$db_password@$db_host:$db_port/$db_name"
            print_success "Local PostgreSQL configuration set"
        else
            print_warning "PostgreSQL client not found"
            print_info "Please install PostgreSQL: https://www.postgresql.org/download/"
            read -p "Enter your PostgreSQL connection URL: " DATABASE_URL
        fi
        ;;
    2)
        echo
        print_info "Setting up cloud database connection..."
        print_info "Popular options:"
        print_info "- Neon: https://neon.tech/"
        print_info "- Supabase: https://supabase.com/"
        print_info "- Railway: https://railway.app/"
        echo
        read -p "Enter your database connection URL: " DATABASE_URL
        ;;
    3)
        print_warning "Database setup skipped"
        DATABASE_URL="postgresql://username:password@localhost:5432/homeo_health"
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo

# API Key setup
print_question "AI Configuration"
print_info "You need a Gemini API key for AI-powered medicine suggestions."
print_info "Get your free API key at: https://makersuite.google.com/app/apikey"
echo

read -p "Do you have a Gemini API key? (y/N): " -n 1 -r
echo

GEMINI_API_KEY=""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your Gemini API key: " GEMINI_API_KEY
    print_success "Gemini API key configured"
else
    print_warning "Gemini API key not configured"
    print_info "AI features will be disabled until you add the key"
    GEMINI_API_KEY="your_gemini_api_key_here"
fi

echo

# Generate session secret
print_info "Generating secure session secret..."
if command -v openssl >/dev/null 2>&1; then
    SESSION_SECRET=$(openssl rand -hex 32)
    print_success "Session secret generated"
elif command -v python3 >/dev/null 2>&1; then
    SESSION_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    print_success "Session secret generated"
else
    SESSION_SECRET="change-this-to-a-secure-random-string-in-production"
    print_warning "Could not generate secure session secret automatically"
fi

# Create .env file
print_info "Creating environment configuration..."

cat > .env << EOF
# Database Configuration
DATABASE_URL=$DATABASE_URL

# AI Configuration
GEMINI_API_KEY=$GEMINI_API_KEY

# Session Configuration
SESSION_SECRET=$SESSION_SECRET

# Server Configuration
PORT=5000
NODE_ENV=development
EOF

print_success ".env file created"

echo

# Database schema setup
if [ "$DATABASE_URL" != "postgresql://username:password@localhost:5432/homeo_health" ]; then
    print_info "Setting up database schema..."
    
    if npm run db:push; then
        print_success "Database schema created successfully"
    else
        print_warning "Database schema setup failed"
        print_info "You may need to check your database connection and try again"
        print_info "Run 'npm run db:push' manually after fixing the connection"
    fi
else
    print_warning "Database schema setup skipped (no valid connection)"
fi

echo

# VS Code setup
if command -v code >/dev/null 2>&1; then
    print_question "VS Code Integration"
    read -p "Open project in VS Code now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Opening project in VS Code..."
        code .
        print_success "Project opened in VS Code"
    fi
fi

echo

# Final summary
print_success "Setup completed successfully!"
echo
print_info "Configuration Summary:"
print_info "- Database: ${DATABASE_URL}"
print_info "- AI Features: $([ "$GEMINI_API_KEY" != "your_gemini_api_key_here" ] && echo "Enabled" || echo "Disabled")"
print_info "- Environment: Development"
echo

print_info "Default Login Credentials:"
print_info "- Admin: admin / admin123"
print_info "- Doctor: ranajit / ranajit123"
echo

print_info "Available Commands:"
print_info "- npm run dev         # Start development server"
print_info "- npm run build       # Build for production"
print_info "- npm run db:push     # Update database schema"
print_info "- npm run db:studio   # Open database GUI"
echo

# Ask to start development server
read -p "Start development server now? (Y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    print_info "Starting development server..."
    print_info "The application will be available at: http://localhost:5000"
    echo
    npm run dev
else
    print_info "Setup complete! Run 'npm run dev' when ready to start development."
fi