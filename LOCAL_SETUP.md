# My Homeo Health - Local Development Setup

## Overview

My Homeo Health is a comprehensive homeopathy clinic management system with role-based access control, patient management, appointment scheduling, prescription management, and AI-powered features.

## Important: Database Configuration

The application has been updated to use standard PostgreSQL drivers for better local development support. This resolves WebSocket connection errors that occurred with cloud-only database configurations.

### Database Options
1. **Local PostgreSQL**: Install PostgreSQL locally (recommended for development)
2. **Docker PostgreSQL**: Use our automated Docker setup script
3. **Cloud PostgreSQL**: Any cloud service (Neon, Supabase, etc.)

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

### Required Software
- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **PostgreSQL** >= 13.0 ([Download](https://www.postgresql.org/downloads/))
- **Git** ([Download](https://git-scm.com/downloads))
- **Visual Studio Code** (recommended) ([Download](https://code.visualstudio.com/))

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features (built-in)
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- PostgreSQL by Chris Kolkman
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

## Quick Setup (Automated)

### Option 1: Interactive Setup Script
```bash
git clone <your-repository-url>
cd my-homeo-health
chmod +x setup.sh
./setup.sh
```

### Option 2: Docker Setup (Easiest)
```bash
git clone <your-repository-url>
cd my-homeo-health
chmod +x docker-setup.sh
./docker-setup.sh
```

### Option 3: Quick Setup (Non-interactive)
```bash
git clone <your-repository-url>
cd my-homeo-health
chmod +x quick-setup.sh
./quick-setup.sh
```

## Manual Setup

### 1. Clone and Install Dependencies
```bash
git clone <your-repository-url>
cd my-homeo-health
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/homeo_health

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Session Configuration
SESSION_SECRET=your-secure-session-secret-key-here

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 3. Database Setup

#### Option A: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database:
   ```sql
   CREATE DATABASE homeo_health;
   CREATE USER homeo_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE homeo_health TO homeo_user;
   ```
3. Update DATABASE_URL in `.env`

#### Option B: Cloud Database (Neon, Supabase, etc.)
1. Create a PostgreSQL database on your preferred cloud provider
2. Copy the connection URL to DATABASE_URL in `.env`

### 4. API Keys Setup

#### Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

### 5. Database Schema
```bash
npm run db:push
```

### 6. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Troubleshooting Common Issues

### Error: WebSocket Connection Failed / ECONNREFUSED
This error occurs when using cloud-specific database drivers with local PostgreSQL. The application has been updated to use standard PostgreSQL drivers.

**Solution:**
1. Ensure you're using the latest code with standard PostgreSQL drivers
2. Use a local PostgreSQL connection string: `postgresql://username:password@localhost:5432/database_name`
3. Or use the Docker setup script for automated database configuration

### Error: Port 5002 ENOTSUP
This error can occur with certain WebSocket configurations.

**Solution:**
1. The application has been updated to avoid this issue
2. Ensure PORT environment variable is set to 5000 (default)
3. Restart the development server after configuration changes

### Database Connection Issues
**Symptoms:** Connection timeouts, authentication failures

**Solutions:**
1. Verify PostgreSQL is running: `pg_ctl status` or `brew services list | grep postgresql`
2. Check database credentials in `.env` file
3. Test connection manually: `psql -h localhost -U username -d database_name`
4. Use Docker setup for isolated database environment

## Default Login Credentials

### Admin Account
- **Username:** admin
- **Password:** admin123

### Doctor Account
- **Username:** ranajit
- **Password:** ranajit123

## Project Structure

```
my-homeo-health/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   └── lib/           # Utility libraries
├── server/                # Backend Express application
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data access layer
│   ├── routes.ts         # API routes
│   ├── gemini.ts         # AI integration
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── package.json          # Project dependencies
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── drizzle.config.ts     # Database configuration
└── tsconfig.json         # TypeScript configuration
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run preview         # Preview production build

# Database
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Drizzle Studio (database GUI)

# Type Checking
npm run type-check      # Run TypeScript type checking
```

## Development Workflow

### 1. Starting Development
```bash
npm run dev
```
This starts both the frontend (Vite) and backend (Express) servers concurrently.

### 2. Database Changes
When modifying the database schema in `shared/schema.ts`:
```bash
npm run db:push
```

### 3. Adding New Dependencies
```bash
# Frontend dependencies
npm install package-name

# Development dependencies
npm install -D package-name
```

## VS Code Configuration

### Recommended Settings (.vscode/settings.json)
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Launch Configuration (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Program",
      "program": "${workspaceFolder}/server/index.ts",
      "request": "launch",
      "skipFiles": ["<node_internals>/**"],
      "type": "node",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists and user has permissions

#### 2. Port Already in Use
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9
# Or change PORT in .env file
```

#### 3. Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 4. TypeScript Errors
```bash
npm run type-check
```

#### 5. Database Schema Issues
```bash
npm run db:push
```

### Environment Variables Checklist
- [ ] DATABASE_URL is set and valid
- [ ] GEMINI_API_KEY is set
- [ ] SESSION_SECRET is set
- [ ] PORT is available (default: 5000)

## Production Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_secure_production_secret
PORT=5000
```

## Support

If you encounter any issues during setup:

1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure environment variables are correctly set
4. Check the console for specific error messages

## Feature Overview

### Core Features
- **User Management:** Role-based access (Admin, Doctor)
- **Patient Management:** Comprehensive patient records
- **Appointment Scheduling:** Calendar-based booking system
- **Prescription Management:** Digital prescription creation
- **Medicine Database:** Comprehensive medicine catalog
- **AI Integration:** Gemini AI for medicine suggestions
- **Print Templates:** Customizable prescription templates
- **Multi-language Support:** English/Bengali interface

### Admin Features
- Doctor management and permissions
- Template management and assignment
- System-wide analytics and reporting
- User role management

### Doctor Features
- Patient management
- Prescription creation with AI assistance
- Appointment scheduling
- Analytics dashboard
- Print prescription with assigned templates

This setup guide ensures you can run My Homeo Health locally with full functionality.