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
    
    # Show existing databases
    echo ""
    print_status "Available PostgreSQL databases:"
    echo ""
    
    # Get list of databases (excluding system databases)
    existing_dbs=$(psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -v -E '^\s*(template[01]|postgres)\s*$' | sed 's/^ *//g' | sed 's/ *$//g' | grep -v '^$' | sort)
    
    if [[ -n "$existing_dbs" ]]; then
        echo "Existing databases:"
        counter=1
        declare -a db_array
        while IFS= read -r db; do
            echo "  $counter) $db"
            db_array[$counter]="$db"
            ((counter++))
        done <<< "$existing_dbs"
        echo "  $counter) Create new database"
        echo ""
        
        while true; do
            read -p "Select database (1-$counter) or enter custom name: " db_choice
            
            # Check if it's a number
            if [[ "$db_choice" =~ ^[0-9]+$ ]]; then
                if [[ $db_choice -ge 1 && $db_choice -lt $counter ]]; then
                    # Selected existing database
                    db_name="${db_array[$db_choice]}"
                    db_exists=true
                    break
                elif [[ $db_choice -eq $counter ]]; then
                    # Create new database
                    read -p "Enter new database name (default: myhomeohealth): " db_name
                    if [[ -z "$db_name" ]]; then
                        db_name="myhomeohealth"
                    fi
                    db_exists=false
                    break
                else
                    print_error "Invalid selection. Please choose 1-$counter"
                fi
            else
                # Custom database name entered
                db_name="$db_choice"
                # Check if this custom name exists
                if echo "$existing_dbs" | grep -qw "$db_name"; then
                    db_exists=true
                else
                    db_exists=false
                fi
                break
            fi
        done
    else
        print_warning "No existing databases found or unable to list databases"
        read -p "Enter database name (default: myhomeohealth): " db_name
        if [[ -z "$db_name" ]]; then
            db_name="myhomeohealth"
        fi
        db_exists=false
    fi
    
    # Check database existence based on selection
    if [[ "$db_exists" == "true" ]]; then
        print_success "Using existing database '$db_name'"
    else
        print_status "Will create new database '$db_name'"
    fi
    
    if [[ "$db_exists" == "true" ]]; then
        print_success "Database '$db_name' already exists"
        
        # Ask for existing credentials
        echo ""
        print_status "Please provide credentials for existing database:"
        read -p "PostgreSQL username: " db_user
        read -s -p "PostgreSQL password: " db_password
        echo ""
        read -p "PostgreSQL host (default: localhost): " db_host
        if [[ -z "$db_host" ]]; then
            db_host="localhost"
        fi
        read -p "PostgreSQL port (default: 5432): " db_port
        if [[ -z "$db_port" ]]; then
            db_port="5432"
        fi
        
        # Test connection
        export PGPASSWORD="$db_password"
        if psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "\q" 2>/dev/null; then
            print_success "Database connection successful"
            DATABASE_URL="postgresql://$db_user:$db_password@$db_host:$db_port/$db_name"
        else
            print_error "Failed to connect to database with provided credentials"
            return 1
        fi
        
    else
        print_status "Database '$db_name' not found. Creating new database..."
        
        # Generate random password for new database
        db_user="homeo_user"
        db_password=$(openssl rand -base64 12 2>/dev/null || date +%s | sha256sum | base64 | head -c 12)
        db_host="localhost"
        db_port="5432"
        
        # Create database and user
        print_status "Creating database and user..."
        
        # Use postgres superuser to create database
        if command_exists sudo; then
            sudo -u postgres psql -c "CREATE DATABASE $db_name;" 2>/dev/null || {
                print_status "Trying alternative database creation method..."
                psql -U postgres -c "CREATE DATABASE $db_name;" 2>/dev/null || {
                    print_error "Failed to create database. Please ensure PostgreSQL is running and you have proper permissions."
                    print_status "Manual setup: Run 'createdb $db_name' or ask your administrator to create the database."
                    return 1
                }
            }
            
            sudo -u postgres psql -c "CREATE USER $db_user WITH ENCRYPTED PASSWORD '$db_password';" 2>/dev/null || true
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $db_name TO $db_user;" 2>/dev/null || true
            sudo -u postgres psql -c "ALTER USER $db_user CREATEDB;" 2>/dev/null || true
        else
            createdb "$db_name" 2>/dev/null || {
                print_error "Failed to create database. Please run: createdb $db_name"
                return 1
            }
        fi
        
        print_success "Database '$db_name' created successfully"
        print_success "Database user '$db_user' created with password: $db_password"
        
        DATABASE_URL="postgresql://$db_user:$db_password@$db_host:$db_port/$db_name"
        
        # Save credentials to a file for reference
        echo "Database Credentials (save this information):" > .database-info.txt
        echo "Database Name: $db_name" >> .database-info.txt
        echo "Username: $db_user" >> .database-info.txt
        echo "Password: $db_password" >> .database-info.txt
        echo "Host: $db_host" >> .database-info.txt
        echo "Port: $db_port" >> .database-info.txt
        echo "Connection URL: $DATABASE_URL" >> .database-info.txt
        
        print_warning "Database credentials saved to .database-info.txt"
    fi
    
    # Save to .env.local
    echo "DATABASE_URL=$DATABASE_URL" > .env.local
    print_success "Database configuration saved to .env.local"
    
    return 0
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
    
    # Extract database components from DATABASE_URL for individual env vars
    if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    fi
    
    # Add other environment variables to .env.local (DATABASE_URL was already added)
    cat >> .env.local << EOF

# Individual Database Configuration
PGHOST=$DB_HOST
PGPORT=$DB_PORT
PGDATABASE=$DB_NAME
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD

# Server Configuration
NODE_ENV=development
SESSION_SECRET=$(openssl rand -base64 32)

# Development Settings
VITE_API_URL=http://localhost:5000
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
    source .env.local
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