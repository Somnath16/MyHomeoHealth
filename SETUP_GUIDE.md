# My Homeo Health - Local Setup Guide

This guide will help you set up My Homeo Health on your local machine with automated scripts.

## Quick Start

### For Windows Users
1. Download or clone the project
2. Open Command Prompt as Administrator
3. Navigate to the project directory
4. Run: `setup.bat`

### For Linux/macOS Users
1. Download or clone the project
2. Open Terminal
3. Navigate to the project directory
4. Make the script executable: `chmod +x setup.sh`
5. Run: `./setup.sh`

## What the Setup Script Does

### 1. **System Dependencies Check & Installation**
- **Node.js**: Checks for Node.js 18+ and installs if missing
- **PostgreSQL**: Checks for PostgreSQL and guides installation if needed
- **Package Manager**: Ensures npm is available

### 2. **Database Configuration**
- Creates a local PostgreSQL database (`homeo_health`)
- Sets up database user with proper permissions
- Configures connection strings
- Alternative: Supports cloud database URLs

### 3. **Project Dependencies**
- Installs all npm packages automatically
- Handles both production and development dependencies

### 4. **Environment Configuration**
- Creates `.env.local` file with all necessary variables
- Generates secure session secrets
- Configures database connections
- Sets up development environment

### 5. **AI Integration Setup (Optional)**
- **Google Gemini**: For AI-powered prescriptions and medicine suggestions
- **OpenAI GPT**: Alternative AI provider
- **Anthropic Claude**: Another AI provider option
- Configures API keys securely

### 6. **Port Management**
- Checks if default port 5000 is available
- Automatically finds alternative ports if needed
- Updates all configuration files accordingly

### 7. **Database Initialization**
- Runs database migrations
- Sets up initial schema
- Prepares database for first use

### 8. **Application Launch**
- Builds the project (if possible)
- Offers to start the application immediately
- Provides clear instructions for manual start

## Manual Setup (If Scripts Fail)

### Prerequisites Installation

#### Windows
1. **Node.js**: Download from [nodejs.org](https://nodejs.org/) (v18+)
2. **PostgreSQL**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

#### Linux (Ubuntu/Debian)
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

#### macOS
```bash
# Install Homebrew first if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node@20 postgresql@15
brew services start postgresql@15
```

### Manual Project Setup

1. **Clone/Download Project**
```bash
git clone <repository-url>
cd homeo-health
```

2. **Install Dependencies**
```bash
npm install
```

3. **Setup Database**
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE homeo_health;
CREATE USER homeo_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE homeo_health TO homeo_user;
ALTER USER homeo_user CREATEDB;
```

4. **Create Environment File**
Create `.env.local` with:
```env
DATABASE_URL=postgresql://homeo_user:your_password@localhost:5432/homeo_health
PGHOST=localhost
PGPORT=5432
PGDATABASE=homeo_health
PGUSER=homeo_user
PGPASSWORD=your_password
NODE_ENV=development
SESSION_SECRET=your_32_character_secret
PORT=5000

# Optional AI Configuration
GEMINI_API_KEY=your_gemini_key
# OR
OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key
```

5. **Initialize Database**
```bash
npm run db:push
```

6. **Start Application**
```bash
npm run dev
```

## Default Credentials

After setup, you can log in with:

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full system administration

### Doctor Access
- **Username**: `doctor` or `ranajit`
- **Password**: `doctor123` or `ranajit123`
- **Access**: Patient management, prescriptions, appointments

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - The script will auto-detect and suggest alternative ports
   - Manually change PORT in `.env.local` if needed

2. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check credentials in `.env.local`
   - Ensure database exists

3. **Permission Denied (Linux/macOS)**
   - Run: `chmod +x setup.sh`
   - Use `sudo` for system-level installations

4. **Node.js Version Too Old**
   - Install Node.js 18+ from official website
   - Update npm: `npm install -g npm@latest`

### Getting Help

1. **Check the logs**: Look for detailed error messages in the terminal
2. **Database issues**: Verify PostgreSQL service is running
3. **Port conflicts**: Try a different port number
4. **Permissions**: Ensure you have admin/sudo rights for installations

## Features Available After Setup

- 👥 **Patient Management**: Complete patient records and history
- 📅 **Appointment Scheduling**: Doctor availability and booking system
- 💊 **Medicine Management**: Inventory tracking with low stock alerts
- 📋 **Prescription System**: Digital prescriptions with templates
- 🤖 **AI Integration**: AI-powered medicine suggestions and prescriptions
- 📱 **Mobile Responsive**: Works on all devices
- 🌐 **Multi-language**: English and Bengali support
- 👨‍⚕️ **Multi-doctor**: Support for multiple practitioners
- 🔐 **Secure**: Role-based access control

## Production Deployment

For production deployment, consider:
- Using a cloud database (Neon, Supabase, etc.)
- Setting up proper SSL certificates
- Configuring environment-specific variables
- Using a process manager like PM2
- Setting up automated backups

The application is ready for deployment on platforms like:
- Replit (primary platform)
- Heroku
- Vercel
- Railway
- DigitalOcean

Happy coding! 🚀