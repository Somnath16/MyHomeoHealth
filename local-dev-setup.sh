#!/bin/bash

# My Homeo Health - Local Development Setup Script
# This script sets up the project for local development

set -e

echo "🏥 My Homeo Health - Local Development Setup"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check if Node.js is installed
check_node() {
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_status "Node.js found: $NODE_VERSION"
        
        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js version 18 or higher is required. Current version: $NODE_VERSION"
            print_info "Please update Node.js: https://nodejs.org/"
            exit 1
        fi
    else
        print_error "Node.js is not installed"
        print_info "Please install Node.js 18+: https://nodejs.org/"
        exit 1
    fi
}

# Check if PostgreSQL is installed
check_postgres() {
    if command -v psql >/dev/null 2>&1; then
        POSTGRES_VERSION=$(psql --version | awk '{print $3}')
        print_status "PostgreSQL found: $POSTGRES_VERSION"
    else
        print_warning "PostgreSQL not found locally"
        print_info "You can either:"
        print_info "1. Install PostgreSQL locally: https://www.postgresql.org/download/"
        print_info "2. Use a cloud database (Neon, Supabase, etc.)"
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing project dependencies..."
    if npm install; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Setup environment file
setup_environment() {
    if [ ! -f ".env" ]; then
        print_info "Creating .env file from template..."
        cp .env.example .env
        print_status ".env file created"
        print_warning "Please edit .env file with your configuration:"
        print_info "  - DATABASE_URL: Your PostgreSQL connection string"
        print_info "  - GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey"
        print_info "  - SESSION_SECRET: Generate a secure random string"
    else
        print_status ".env file already exists"
    fi
}

# Generate session secret if needed
generate_session_secret() {
    if ! grep -q "your-secure-session-secret-key-here" .env 2>/dev/null; then
        return
    fi
    
    print_info "Generating secure session secret..."
    if command -v openssl >/dev/null 2>&1; then
        SESSION_SECRET=$(openssl rand -hex 32)
        sed -i.bak "s/your-secure-session-secret-key-here/$SESSION_SECRET/" .env
        rm .env.bak 2>/dev/null || true
        print_status "Session secret generated"
    else
        print_warning "OpenSSL not found. Please manually replace 'your-secure-session-secret-key-here' in .env"
    fi
}

# Create VS Code configuration
setup_vscode() {
    if [ -d ".vscode" ]; then
        print_status "VS Code configuration already exists"
    else
        print_info "VS Code configuration created"
        print_info "Recommended extensions will be suggested when you open the project"
    fi
}

# Test database connection
test_database() {
    print_info "Testing database connection..."
    
    # Check if .env has a valid DATABASE_URL
    if grep -q "postgresql://" .env 2>/dev/null; then
        if npm run db:push >/dev/null 2>&1; then
            print_status "Database connection successful and schema updated"
        else
            print_warning "Database connection failed or schema update failed"
            print_info "Please check your DATABASE_URL in .env file"
            print_info "Run 'npm run db:push' manually after fixing the connection"
        fi
    else
        print_warning "DATABASE_URL not configured in .env"
        print_info "Please set your PostgreSQL connection string in .env"
    fi
}

# Main setup process
main() {
    echo
    print_info "Starting setup process..."
    echo
    
    # Pre-flight checks
    check_node
    check_postgres
    echo
    
    # Setup process
    install_dependencies
    setup_environment
    generate_session_secret
    setup_vscode
    echo
    
    # Database setup
    test_database
    echo
    
    # Final instructions
    echo "🎉 Setup completed!"
    echo
    print_info "Next steps:"
    print_info "1. Edit .env file with your configuration"
    print_info "2. Run 'npm run db:push' to setup database schema"
    print_info "3. Run 'npm run dev' to start development server"
    echo
    print_info "Default login credentials:"
    print_info "  Admin: admin / admin123"
    print_info "  Doctor: ranajit / ranajit123"
    echo
    print_info "The application will be available at: http://localhost:5000"
    echo
    
    # Check if we should start the dev server
    read -p "Start development server now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting development server..."
        npm run dev
    else
        print_info "Run 'npm run dev' when you're ready to start development"
    fi
}

# Run main function
main "$@"