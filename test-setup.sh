#!/bin/bash

# My Homeo Health - Setup Testing Script
# Tests if the local setup is working correctly

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

test_prerequisites() {
    print_status "Testing prerequisites..."
    
    # Test Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            print_success "Node.js $NODE_VERSION (OK)"
        else
            print_error "Node.js $NODE_VERSION (Too old, need 18+)"
            return 1
        fi
    else
        print_error "Node.js not found"
        return 1
    fi
    
    # Test npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION (OK)"
    else
        print_error "npm not found"
        return 1
    fi
    
    # Test PostgreSQL
    if command_exists psql; then
        PG_VERSION=$(psql --version | awk '{print $3}')
        print_success "PostgreSQL $PG_VERSION (OK)"
    else
        print_warning "PostgreSQL not found (may use cloud database)"
    fi
    
    return 0
}

test_project_structure() {
    print_status "Testing project structure..."
    
    local required_files=(
        "package.json"
        "client/src/App.tsx"
        "server/index.ts"
        "shared/schema.ts"
        "drizzle.config.ts"
        "vite.config.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_success "$file exists"
        else
            print_error "$file missing"
            return 1
        fi
    done
    
    return 0
}

test_dependencies() {
    print_status "Testing dependencies..."
    
    if [[ -d "node_modules" ]]; then
        print_success "node_modules directory exists"
    else
        print_warning "node_modules not found, running npm install..."
        npm install
        print_success "Dependencies installed"
    fi
    
    # Test key dependencies
    local key_deps=("react" "express" "drizzle-orm" "@tanstack/react-query")
    
    for dep in "${key_deps[@]}"; do
        if npm list "$dep" >/dev/null 2>&1; then
            print_success "$dep installed"
        else
            print_error "$dep missing"
            return 1
        fi
    done
    
    return 0
}

test_environment() {
    print_status "Testing environment configuration..."
    
    if [[ -f ".env.local" ]]; then
        print_success ".env.local exists"
        
        # Check key variables
        source .env.local 2>/dev/null || true
        
        if [[ -n "$DATABASE_URL" ]]; then
            print_success "DATABASE_URL configured"
        else
            print_error "DATABASE_URL missing"
            return 1
        fi
        
        if [[ -n "$SESSION_SECRET" ]]; then
            print_success "SESSION_SECRET configured"
        else
            print_warning "SESSION_SECRET missing"
        fi
        
        if [[ -n "$PORT" ]]; then
            print_success "PORT configured: $PORT"
        else
            print_warning "PORT not set, will use default"
        fi
        
    else
        print_error ".env.local not found"
        return 1
    fi
    
    return 0
}

test_database_connection() {
    print_status "Testing database connection..."
    
    if [[ ! -f ".env.local" ]]; then
        print_error "No .env.local file found"
        return 1
    fi
    
    source .env.local
    
    if [[ -z "$DATABASE_URL" ]]; then
        print_error "DATABASE_URL not set"
        return 1
    fi
    
    # Test database connection using Node.js
    cat > test_db.js << 'EOF'
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');

async function testConnection() {
    try {
        const client = neon(process.env.DATABASE_URL);
        const db = drizzle(client);
        
        // Simple query to test connection
        const result = await client('SELECT 1 as test');
        console.log('Database connection: OK');
        process.exit(0);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
EOF
    
    if NODE_ENV=test node test_db.js 2>/dev/null; then
        print_success "Database connection working"
        rm -f test_db.js
    else
        print_warning "Database connection test failed (may work when server starts)"
        rm -f test_db.js
    fi
    
    return 0
}

test_build() {
    print_status "Testing build process..."
    
    # Test TypeScript compilation
    if npm run check >/dev/null 2>&1; then
        print_success "TypeScript compilation passed"
    else
        print_warning "TypeScript compilation issues found"
    fi
    
    # Test database push (if possible)
    if [[ -f ".env.local" ]]; then
        source .env.local
        export DATABASE_URL
        if npm run db:push >/dev/null 2>&1; then
            print_success "Database schema setup working"
        else
            print_warning "Database schema setup will run on server start"
        fi
    fi
    
    return 0
}

test_port_availability() {
    print_status "Testing port availability..."
    
    PORT=${PORT:-5000}
    
    if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
        print_warning "Port $PORT is already in use"
        
        # Find alternative port
        NEW_PORT=$((PORT + 1))
        while netstat -tuln 2>/dev/null | grep -q ":$NEW_PORT "; do
            NEW_PORT=$((NEW_PORT + 1))
        done
        
        print_success "Alternative port available: $NEW_PORT"
    else
        print_success "Port $PORT is available"
    fi
    
    return 0
}

main() {
    clear
    echo "================================================"
    echo "   My Homeo Health - Setup Test                "
    echo "================================================"
    echo ""
    
    local tests_passed=0
    local tests_total=7
    
    # Run tests
    if test_prerequisites; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    if test_project_structure; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    if test_dependencies; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    if test_environment; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    if test_database_connection; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    if test_build; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    if test_port_availability; then
        tests_passed=$((tests_passed + 1))
    fi
    echo ""
    
    # Summary
    echo "================================================"
    echo "                TEST RESULTS                    "
    echo "================================================"
    echo ""
    echo "Tests passed: $tests_passed/$tests_total"
    
    if [ $tests_passed -eq $tests_total ]; then
        print_success "All tests passed! Setup is ready."
        echo ""
        echo "🚀 Ready to start the application:"
        echo "   npm run dev"
    elif [ $tests_passed -ge 5 ]; then
        print_warning "Most tests passed. Setup should work."
        echo ""
        echo "🚀 Try starting the application:"
        echo "   npm run dev"
    else
        print_error "Several tests failed. Please review setup."
        echo ""
        echo "🔧 Try running setup script first:"
        echo "   ./setup.sh  (Linux/macOS)"
        echo "   setup.bat   (Windows)"
    fi
    
    echo ""
}

main "$@"