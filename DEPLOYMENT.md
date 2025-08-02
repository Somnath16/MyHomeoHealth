# Deployment Guide

This document provides comprehensive deployment instructions for the My Homeo Health application in both development and production environments.

## Quick Deployment Checklist

### ✅ Environment Setup
- [ ] Node.js >= 18.0.0 installed
- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema pushed (`npm run db:push`)

### ✅ Production Deployment
- [ ] Build application (`npm run build`)
- [ ] Set NODE_ENV=production
- [ ] Configure HTTPS/SSL
- [ ] Start application (`npm start`)

## Environment Configuration

### Development Environment
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Production Environment
```bash
# Build the application
npm run build

# Set production environment
export NODE_ENV=production

# Start production server
npm start
```

## Environment Variables

### Required Variables
```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development|production
```

### Recommended Variables
```env
GEMINI_API_KEY=your_gemini_api_key_for_ai_features
SESSION_SECRET=your_secure_random_session_secret
PORT=5000
```

### Optional Variables
```env
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name
```

## Database Setup

### PostgreSQL Configuration
The application supports both local and cloud PostgreSQL databases:

- **Local Development**: Standard PostgreSQL with SSL disabled
- **Production**: Cloud databases (Neon, Supabase, etc.) with SSL enabled

### Schema Management
```bash
# Push schema changes to database
npm run db:push

# Open database studio (optional)
npm run db:studio
```

## Server Configuration

### Development Mode
- Vite development server with HMR
- Hot module replacement for client code
- TypeScript compilation on-the-fly
- Database connection pooling (5 connections)

### Production Mode
- Static file serving from dist/public
- Optimized bundle with esbuild
- Enhanced security headers
- Database connection pooling (20 connections)
- HTTPS-only cookies

## File Upload Configuration

### Supported Formats
- CSV files (.csv)
- Excel files (.xlsx, .xls)
- PDF files (.pdf)

### Limits
- Maximum file size: 10MB
- Memory storage for processing
- Automatic format detection

## Session Management

### Development
- HTTP cookies allowed
- SameSite: 'lax'
- 24-hour session duration

### Production
- HTTPS-only cookies
- SameSite: 'strict'
- Secure session handling

## Build Process

### Client Build
```bash
# Vite builds the React frontend
vite build
# Output: dist/public/
```

### Server Build
```bash
# esbuild bundles the Express server
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
# Output: dist/index.js
```

## Health Checks

### Development
- Server starts on localhost:5000
- Vite dev server provides HMR
- Database connection verified on startup

### Production
- Server binds to 0.0.0.0:5000 (configurable)
- Static files served efficiently
- Database connection pool monitoring

## Security Considerations

### Development
- CORS enabled for localhost
- Session cookies over HTTP
- Debug logging enabled

### Production
- HTTPS enforcement
- Secure session configuration
- Rate limiting (100 requests/minute)
- Database connection encryption

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test database connection
npm run db:push
```

#### Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npm run check
```

#### Session Issues
```bash
# Verify SESSION_SECRET is set
echo $SESSION_SECRET

# Check cookie configuration in browser dev tools
```

### Environment Validation
The application automatically validates required environment variables on startup and provides helpful error messages for missing configuration.

## Monitoring and Logging

### Development
- Detailed request logging
- HMR status updates
- Database query logging

### Production
- Structured logging format
- Performance metrics
- Error tracking

## Scaling Considerations

### Database
- Connection pooling configured based on environment
- SSL/TLS encryption for cloud databases
- Automatic reconnection handling

### Application
- Stateless design for horizontal scaling
- Session storage can be moved to Redis/PostgreSQL
- File uploads stored in memory (consider object storage for large scale)

## Backup and Recovery

### Database
- Regular PostgreSQL backups recommended
- Schema migrations via Drizzle Kit
- Point-in-time recovery support

### Application
- Source code in version control
- Environment configuration documented
- Deployment automation recommended