# My Homeo Health - Deployment Guide

This document provides comprehensive deployment instructions for My Homeo Health on various platforms.

## Local Development Setup

### Quick Setup Options

1. **Full Automated Setup (Recommended)**
   ```bash
   # Linux/macOS
   chmod +x setup.sh && ./setup.sh
   
   # Windows (Run as Administrator)
   setup.bat
   ```

2. **Quick Start (If you have Node.js & PostgreSQL)**
   ```bash
   chmod +x quick-start.sh && ./quick-start.sh
   ```

3. **Docker Setup**
   ```bash
   chmod +x docker-setup.sh && ./docker-setup.sh
   ```

4. **Test Your Setup**
   ```bash
   chmod +x test-setup.sh && ./test-setup.sh
   ```

### What Gets Configured

- **Node.js 18+**: Automatic installation verification
- **PostgreSQL**: Database setup with proper user permissions
- **Environment Variables**: Secure configuration with session secrets
- **Dependencies**: All npm packages installed
- **Database Schema**: Automatic migration and setup
- **AI Integration**: Optional Gemini/OpenAI/Anthropic configuration
- **Port Management**: Automatic port conflict resolution

## Environment Configuration

### Required Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=development
SESSION_SECRET=your-secure-session-secret
PORT=5000
```

### Optional Variables
```env
# AI Integration (choose one)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database Connection Details (auto-configured)
PGHOST=localhost
PGPORT=5432
PGDATABASE=homeo_health
PGUSER=homeo_user
PGPASSWORD=your_password
```

## Cloud Deployment

### Replit (Primary Platform)
1. Import the repository to Replit
2. Replit automatically provisions PostgreSQL
3. No additional configuration needed
4. Click "Run" to start

### Vercel
1. Deploy frontend to Vercel
2. Configure external PostgreSQL (Neon, Supabase, etc.)
3. Set environment variables in Vercel dashboard
4. Use serverless functions for API

### Railway
1. Connect GitHub repository
2. Railway auto-detects Node.js project
3. Add PostgreSQL service
4. Configure environment variables
5. Deploy automatically

### Heroku
1. Create new Heroku app
2. Add Heroku Postgres add-on
3. Configure environment variables
4. Deploy via Git or GitHub integration

### DigitalOcean App Platform
1. Create new app from GitHub
2. Configure Node.js service
3. Add managed PostgreSQL database
4. Set environment variables
5. Deploy

## Database Setup Options

### Local PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Cloud Databases
- **Neon**: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db`
- **Supabase**: `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres`
- **Railway**: `postgresql://user:pass@containers-us-west-xxx.railway.app:port/db`
- **PlanetScale**: `mysql://user:pass@aws.connect.psdb.cloud/db?sslaccept=strict`

## Production Considerations

### Security
- Use strong `SESSION_SECRET` (32+ characters)
- Enable HTTPS/SSL in production
- Set `NODE_ENV=production`
- Use environment-specific database credentials
- Enable CORS for specific domains only

### Performance
- Enable database connection pooling
- Use CDN for static assets
- Implement proper caching strategies
- Monitor database performance
- Set up database indexes for frequently queried data

### Monitoring
- Set up application logging
- Monitor database connections
- Track API response times
- Set up error reporting (Sentry, etc.)
- Monitor system resources

## Default Credentials

After deployment, use these credentials to access the system:

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Complete system administration

### Doctor Accounts
- **Username**: `doctor` / **Password**: `doctor123`
- **Username**: `ranajit` / **Password**: `ranajit123`
- **Access**: Patient management, prescriptions, appointments

**Important**: Change default passwords in production!

## AI Integration Setup

### Google Gemini (Recommended)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Add to environment: `GEMINI_API_KEY=your_key`

### OpenAI
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Add to environment: `OPENAI_API_KEY=your_key`

### Anthropic Claude
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create new API key
3. Add to environment: `ANTHROPIC_API_KEY=your_key`

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Change port in .env.local
PORT=5001
```

**Database Connection Failed**
```bash
# Check PostgreSQL status
systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Test connection
psql -h localhost -U homeo_user -d homeo_health
```

**Build Errors**
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript compilation
npm run check
```

**Environment Variables Not Loading**
- Ensure `.env.local` exists in project root
- Check file permissions
- Restart development server after changes
- Use absolute paths for environment file

### Getting Help

1. **Run the test script**: `./test-setup.sh`
2. **Check logs**: Look for detailed error messages
3. **Verify prerequisites**: Ensure Node.js 18+ and PostgreSQL
4. **Database connectivity**: Test database connection separately
5. **Port conflicts**: Try alternative ports

## Feature Overview

Once deployed, the system provides:

- 👥 **Patient Management**: Complete patient records and medical history
- 📅 **Appointment Scheduling**: Doctor availability and booking system  
- 💊 **Medicine Management**: Inventory tracking with low stock alerts
- 📋 **Prescription System**: Digital prescriptions with professional templates
- 🤖 **AI Integration**: AI-powered medicine suggestions and prescription assistance
- 📱 **Mobile Responsive**: Works seamlessly on all devices
- 🌍 **Multi-language**: English and Bengali language support
- 👨‍⚕️ **Multi-doctor**: Support for multiple practitioners
- 🔐 **Secure Access**: Role-based authentication and authorization
- 📊 **Admin Dashboard**: Complete system administration and reporting

## Support

For deployment issues or questions:
- Review this deployment guide
- Run the test setup script
- Check the troubleshooting section
- Verify environment configuration

---

**Ready to deploy your homeopathy clinic management system!** 🏥