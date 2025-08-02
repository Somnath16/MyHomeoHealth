#!/bin/bash

# My Homeo Health - Automated Setup Script
# This script will install all dependencies and configure the project for local development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get OS type
get_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    OS=$(get_os)
    case $OS in
        "linux")
            # Install Node.js using NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "macos")
            if command_exists brew; then
                brew install node@20
                brew link --overwrite node@20
            else
                print_error "Homebrew is not installed. Please install Homebrew first:"
                print_error "Visit: https://brew.sh/"
                exit 1
            fi
            ;;
        *)
            print_error "Please install Node.js 20.x manually from https://nodejs.org/"
            exit 1
            ;;
    esac
}

# Function to install PostgreSQL
install_postgresql() {
    print_status "Installing PostgreSQL..."
    
    OS=$(get_os)
    case $OS in
        "linux")
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            ;;
        "macos")
            if command_exists brew; then
                brew install postgresql@15
                brew services start postgresql@15
            else
                print_error "Homebrew is not installed. Please install Homebrew first:"
                print_error "Visit: https://brew.sh/"
                exit 1
            fi
            ;;
        *)
            print_error "Please install PostgreSQL manually"
            exit 1
            ;;
    esac
}

# Function to setup PostgreSQL database
setup_database() {
    print_status "Setting up PostgreSQL database..."
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE homeo_health;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER homeo_user WITH ENCRYPTED PASSWORD 'homeo_password';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE homeo_health TO homeo_user;" 2>/dev/null || true
    sudo -u postgres psql -c "ALTER USER homeo_user CREATEDB;" 2>/dev/null || true
    
    # Set the database URL
    DATABASE_URL="postgresql://homeo_user:homeo_password@localhost:5432/homeo_health"
    echo "DATABASE_URL=$DATABASE_URL" > .env.local
    
    print_success "Database setup completed"
}

# Function to get available port
get_available_port() {
    local port=$1
    while netstat -tuln 2>/dev/null | grep -q ":$port "; do
        port=$((port + 1))
    done
    echo $port
}

# Function to configure environment
configure_environment() {
    print_status "Configuring environment variables..."
    
    # Create .env.local file
    cat > .env.local << EOF
# Database Configuration
DATABASE_URL=postgresql://homeo_user:homeo_password@localhost:5432/homeo_health
PGHOST=localhost
PGPORT=5432
PGDATABASE=homeo_health
PGUSER=homeo_user
PGPASSWORD=homeo_password

# Server Configuration
NODE_ENV=development
SESSION_SECRET=$(openssl rand -base64 32)

# Development Settings
VITE_API_URL=http://localhost:$PORT
EOF
    
    # Ask for AI configuration
    echo ""
    read -p "Do you want to configure AI features? (y/n): " configure_ai
    if [[ $configure_ai =~ ^[Yy]$ ]]; then
        echo ""
        echo "Please choose your AI provider:"
        echo "1) Google Gemini"
        echo "2) OpenAI GPT"
        echo "3) Anthropic Claude"
        read -p "Enter your choice (1-3): " ai_choice
        
        case $ai_choice in
            1)
                read -p "Enter your Google Gemini API Key: " gemini_key
                echo "GEMINI_API_KEY=$gemini_key" >> .env.local
                echo "AI_PROVIDER=gemini" >> .env.local
                ;;
            2)
                read -p "Enter your OpenAI API Key: " openai_key
                echo "OPENAI_API_KEY=$openai_key" >> .env.local
                echo "AI_PROVIDER=openai" >> .env.local
                ;;
            3)
                read -p "Enter your Anthropic API Key: " anthropic_key
                echo "ANTHROPIC_API_KEY=$anthropic_key" >> .env.local
                echo "AI_PROVIDER=anthropic" >> .env.local
                ;;
        esac
        print_success "AI configuration completed"
    fi
    
    print_success "Environment configuration completed"
}

# Main setup function
main() {
    clear
    echo "================================================"
    echo "   My Homeo Health - Automated Setup Script    "
    echo "================================================"
    echo ""
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -d "client" ]] || [[ ! -d "server" ]]; then
        print_error "Please run this script from the My Homeo Health project directory"
        exit 1
    fi
    
    print_status "Starting automated setup process..."
    
    # Check and install Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is already installed: $NODE_VERSION"
        
        # Check if version is compatible (18.x or higher)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js version is too old. Installing newer version..."
            install_nodejs
        fi
    else
        print_warning "Node.js not found. Installing..."
        install_nodejs
    fi
    
    # Check and install PostgreSQL
    if command_exists psql; then
        print_success "PostgreSQL is already installed"
    else
        print_warning "PostgreSQL not found. Installing..."
        install_postgresql
    fi
    
    # Setup database
    setup_database
    
    # Install project dependencies
    print_status "Installing project dependencies..."
    npm install
    print_success "Dependencies installed successfully"
    
    # Configure environment
    configure_environment
    
    # Run database migrations
    print_status "Running database setup..."
    export DATABASE_URL="$DATABASE_URL"
    npm run db:push 2>/dev/null || print_warning "Database migration will be attempted when server starts"
    
    # Check port availability
    DEFAULT_PORT=5000
    if netstat -tuln 2>/dev/null | grep -q ":$DEFAULT_PORT "; then
        echo ""
        print_warning "Port $DEFAULT_PORT is already in use"
        read -p "Enter a different port number (default: 5001): " CUSTOM_PORT
        PORT=${CUSTOM_PORT:-5001}
        PORT=$(get_available_port $PORT)
        
        # Update .env.local with custom port
        echo "PORT=$PORT" >> .env.local
        sed -i.bak "s|localhost:5000|localhost:$PORT|g" .env.local 2>/dev/null || true
    else
        PORT=$DEFAULT_PORT
        echo "PORT=$PORT" >> .env.local
    fi
    
    # Build the project
    print_status "Building the project..."
    npm run build 2>/dev/null || print_warning "Build step skipped - will run in development mode"
    
    print_success "Setup completed successfully!"
    echo ""
    echo "================================================"
    echo "             SETUP COMPLETE!                    "
    echo "================================================"
    echo ""
    echo "📊 Database: PostgreSQL (localhost:5432)"
    echo "🌐 Server will run on: http://localhost:$PORT"
    echo "👤 Default admin login: admin / admin123"
    echo "🩺 Default doctor login: doctor / doctor123"
    echo ""
    echo "To start the application:"
    echo "  npm run dev"
    echo ""
    echo "Or run it now?"
    read -p "Start the application now? (y/n): " start_now
    
    if [[ $start_now =~ ^[Yy]$ ]]; then
        print_status "Starting My Homeo Health application..."
        echo ""
        echo "🚀 Application starting on http://localhost:$PORT"
        echo "🔄 This may take a few moments for the first run..."
        echo ""
        npm run dev
    else
        print_success "Setup complete! Run 'npm run dev' when you're ready to start."
    fi
}

# Trap Ctrl+C
trap 'echo -e "\n\n${RED}Setup interrupted by user${NC}"; exit 1' INT

# Run main function
main "$@"