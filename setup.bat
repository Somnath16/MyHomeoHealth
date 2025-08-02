@echo off
setlocal EnableDelayedExpansion

REM My Homeo Health - Windows Automated Setup Script
REM This script will install all dependencies and configure the project for local development

title My Homeo Health - Automated Setup

REM Color codes for Windows
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

echo.
echo ================================================
echo    My Homeo Health - Automated Setup Script    
echo ================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo %RED%[ERROR]%NC% Please run this script from the My Homeo Health project directory
    pause
    exit /b 1
)

REM Check if essential files exist to confirm this is the right project
if not exist "client" (
    echo %RED%[ERROR]%NC% Please run this script from the My Homeo Health project directory
    pause
    exit /b 1
)

echo %BLUE%[INFO]%NC% Starting automated setup process...
echo.

REM Check if Node.js is installed
echo %BLUE%[INFO]%NC% Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%NC% Node.js not found. Please install Node.js first.
    echo.
    echo Opening Node.js download page...
    start https://nodejs.org/en/download/
    echo.
    echo Please install Node.js 20.x or higher and rerun this script.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %GREEN%[SUCCESS]%NC% Node.js is installed: !NODE_VERSION!
)

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%[ERROR]%NC% npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)

REM Check if PostgreSQL is installed
echo %BLUE%[INFO]%NC% Checking PostgreSQL installation...
psql --version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[WARNING]%NC% PostgreSQL not found.
    echo.
    echo Please choose an option:
    echo 1. Install PostgreSQL locally (recommended)
    echo 2. Use cloud database (Neon, Supabase, etc.)
    echo.
    set /p db_choice="Enter your choice (1 or 2): "
    
    if "!db_choice!"=="1" (
        echo %BLUE%[INFO]%NC% Opening PostgreSQL download page...
        start https://www.postgresql.org/download/windows/
        echo.
        echo Please install PostgreSQL and note down the credentials, then rerun this script.
        pause
        exit /b 1
    ) else if "!db_choice!"=="2" (
        echo %BLUE%[INFO]%NC% You'll need to provide your cloud database URL later.
        set USE_CLOUD_DB=true
    ) else (
        echo %RED%[ERROR]%NC% Invalid choice. Exiting.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%i in ('psql --version') do set PG_VERSION=%%i
    echo %GREEN%[SUCCESS]%NC% PostgreSQL is installed: !PG_VERSION!
    set USE_CLOUD_DB=false
)

REM Install project dependencies
echo.
echo %BLUE%[INFO]%NC% Installing project dependencies...
npm install
if errorlevel 1 (
    echo %RED%[ERROR]%NC% Failed to install dependencies
    pause
    exit /b 1
)
echo %GREEN%[SUCCESS]%NC% Dependencies installed successfully

REM Configure environment
echo.
echo %BLUE%[INFO]%NC% Configuring environment variables...

REM Generate session secret
for /f %%i in ('powershell -Command "[System.Web.Security.Membership]::GeneratePassword(32,8)"') do set SESSION_SECRET=%%i

if "!USE_CLOUD_DB!"=="true" (
    echo.
    set /p DATABASE_URL="Enter your cloud database URL: "
) else (
    REM Setup local PostgreSQL database
    echo %BLUE%[INFO]%NC% Setting up local PostgreSQL database...
    
    set /p PG_HOST="PostgreSQL host (default: localhost): "
    if "!PG_HOST!"=="" set PG_HOST=localhost
    
    set /p PG_PORT="PostgreSQL port (default: 5432): "
    if "!PG_PORT!"=="" set PG_PORT=5432
    
    set /p PG_USER="PostgreSQL username (default: postgres): "
    if "!PG_USER!"=="" set PG_USER=postgres
    
    set /p PG_PASSWORD="PostgreSQL password: "
    
    set /p PG_DATABASE="Database name (default: homeo_health): "
    if "!PG_DATABASE!"=="" set PG_DATABASE=homeo_health
    
    set DATABASE_URL=postgresql://!PG_USER!:!PG_PASSWORD!@!PG_HOST!:!PG_PORT!/!PG_DATABASE!
    
    REM Try to create database
    echo %BLUE%[INFO]%NC% Creating database if it doesn't exist...
    psql -h !PG_HOST! -p !PG_PORT! -U !PG_USER! -c "CREATE DATABASE !PG_DATABASE!;" 2>nul
)

REM Create .env.local file
echo DATABASE_URL=!DATABASE_URL! > .env.local
echo PGHOST=!PG_HOST! >> .env.local
echo PGPORT=!PG_PORT! >> .env.local
echo PGDATABASE=!PG_DATABASE! >> .env.local
echo PGUSER=!PG_USER! >> .env.local
echo PGPASSWORD=!PG_PASSWORD! >> .env.local
echo NODE_ENV=development >> .env.local
echo SESSION_SECRET=!SESSION_SECRET! >> .env.local

REM Ask for AI configuration
echo.
set /p configure_ai="Do you want to configure AI features? (y/n): "
if /i "!configure_ai!"=="y" (
    echo.
    echo Please choose your AI provider:
    echo 1. Google Gemini
    echo 2. OpenAI GPT
    echo 3. Anthropic Claude
    set /p ai_choice="Enter your choice (1-3): "
    
    if "!ai_choice!"=="1" (
        set /p gemini_key="Enter your Google Gemini API Key: "
        echo GEMINI_API_KEY=!gemini_key! >> .env.local
        echo AI_PROVIDER=gemini >> .env.local
    ) else if "!ai_choice!"=="2" (
        set /p openai_key="Enter your OpenAI API Key: "
        echo OPENAI_API_KEY=!openai_key! >> .env.local
        echo AI_PROVIDER=openai >> .env.local
    ) else if "!ai_choice!"=="3" (
        set /p anthropic_key="Enter your Anthropic API Key: "
        echo ANTHROPIC_API_KEY=!anthropic_key! >> .env.local
        echo AI_PROVIDER=anthropic >> .env.local
    )
    echo %GREEN%[SUCCESS]%NC% AI configuration completed
)

REM Check port availability
set DEFAULT_PORT=5000
netstat -an | findstr ":!DEFAULT_PORT!" >nul
if not errorlevel 1 (
    echo.
    echo %YELLOW%[WARNING]%NC% Port !DEFAULT_PORT! is already in use
    set /p CUSTOM_PORT="Enter a different port number (press Enter for 5001): "
    if "!CUSTOM_PORT!"=="" set CUSTOM_PORT=5001
    set PORT=!CUSTOM_PORT!
) else (
    set PORT=!DEFAULT_PORT!
)

echo PORT=!PORT! >> .env.local
echo VITE_API_URL=http://localhost:!PORT! >> .env.local

echo %GREEN%[SUCCESS]%NC% Environment configuration completed

REM Run database migrations
echo.
echo %BLUE%[INFO]%NC% Running database setup...
set DATABASE_URL=!DATABASE_URL!
npm run db:push 2>nul || (
    echo %YELLOW%[WARNING]%NC% Database migration will be attempted when server starts
)

REM Build the project
echo.
echo %BLUE%[INFO]%NC% Building the project...
npm run build 2>nul || (
    echo %YELLOW%[WARNING]%NC% Build step skipped - will run in development mode
)

echo.
echo %GREEN%[SUCCESS]%NC% Setup completed successfully!
echo.
echo ================================================
echo              SETUP COMPLETE!                    
echo ================================================
echo.
echo 📊 Database: !DATABASE_URL!
echo 🌐 Server will run on: http://localhost:!PORT!
echo 👤 Default admin login: admin / admin123
echo 🩺 Default doctor login: doctor / doctor123
echo.
echo To start the application:
echo   npm run dev
echo.
set /p start_now="Start the application now? (y/n): "

if /i "!start_now!"=="y" (
    echo.
    echo %BLUE%[INFO]%NC% Starting My Homeo Health application...
    echo.
    echo 🚀 Application starting on http://localhost:!PORT!
    echo 🔄 This may take a few moments for the first run...
    echo.
    npm run dev
) else (
    echo %GREEN%[SUCCESS]%NC% Setup complete! Run 'npm run dev' when you're ready to start.
    pause
)

endlocal