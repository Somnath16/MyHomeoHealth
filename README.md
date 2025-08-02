# My Homeo Health

A comprehensive homeopathy clinic management system with role-based access control, AI-powered features, and modern web technologies.

![My Homeo Health](https://img.shields.io/badge/Status-Production%20Ready-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)

## 🏥 Overview

My Homeo Health is a full-stack healthcare management platform designed specifically for homeopathy clinics. It provides comprehensive patient management, prescription handling, appointment scheduling, and AI-powered medicine suggestions to streamline clinic operations.

## ✨ Key Features

### Core Functionality
- **Role-Based Access Control**: Admin, Doctor, and Patient portals
- **Patient Management**: Comprehensive patient profiles with medical history  
- **Appointment Scheduling**: Calendar-based booking system
- **Prescription Management**: Digital prescription creation and management
- **Medicine Database**: Comprehensive medicine catalog with search
- **Analytics Dashboard**: Real-time clinic analytics and insights

### Advanced Features
- **AI-Powered Medicine Suggestions** 🤖 using Google Gemini
- **Custom Prescription Templates** 📄 with admin management
- **Multi-language Support** 🌐 (English/Bengali)
- **Print Prescription System** 🖨️ with multiple templates
- **Template Assignment System** for doctor-specific templates
- **Real-time Analytics** with interactive charts
- **Mobile-First PWA Design** 📱

## 🚀 Quick Start

### For Local Development Issues (WebSocket/Database Errors)
If you encounter WebSocket connection errors or database issues:
```bash
chmod +x local-fix.sh
./local-fix.sh
```

### Choose your preferred setup method:

### Option 1: Interactive Setup (Recommended)
```bash
git clone <your-repository-url>
cd my-homeo-health
chmod +x setup.sh
./setup.sh
```

### Option 2: Quick Setup (Advanced Users)
```bash
git clone <your-repository-url>
cd my-homeo-health
chmod +x quick-setup.sh
./quick-setup.sh
```

### Option 3: Docker Setup (Easiest)
```bash
git clone <your-repository-url>
cd my-homeo-health
chmod +x docker-setup.sh
./docker-setup.sh
```

### Option 4: Manual Setup
```bash
git clone <your-repository-url>
cd my-homeo-health
npm install
cp .env.example .env
# Edit .env with your configuration
npm run db:push
npm run dev
```

## 📋 System Requirements

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13.0
- **npm** >= 9.0.0
- **Gemini API Key** (for AI features)

## 🔧 Environment Configuration

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/homeo_health

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Session Configuration
SESSION_SECRET=your-secure-session-secret

# Server Configuration
PORT=5000
NODE_ENV=development
```

### Getting API Keys
- **Gemini API**: Get your free API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🏗️ Tech Stack

### Frontend
- **React 18+** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **TanStack Query** for state management
- **Wouter** for routing

### Backend
- **Node.js** with Express
- **TypeScript** with ES modules
- **Drizzle ORM** with PostgreSQL
- **Express Sessions** for authentication
- **Google Gemini AI** integration

### Database
- **PostgreSQL** with connection pooling
- **Drizzle ORM** for type-safe queries
- **Automatic migrations** via Drizzle Kit

## 🎯 Default Credentials

After setup, use these credentials to log in:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Doctor | `ranajit` | `ranajit123` |

## 📁 Project Structure

```
my-homeo-health/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility libraries
├── server/                # Backend Express application
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data access layer
│   ├── routes.ts         # API routes
│   ├── gemini.ts         # AI integration
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── .vscode/              # VS Code configuration
├── setup.sh              # Interactive setup script
├── quick-setup.sh        # Quick setup script
├── docker-setup.sh       # Docker setup script
└── LOCAL_SETUP.md        # Detailed setup guide
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production  
npm run start           # Start production server

# Database
npm run db:push         # Push schema changes to database
npm run db:studio       # Open Drizzle Studio (database GUI)

# Type Checking
npm run check           # Run TypeScript type checking
```

## 🖥️ VS Code Integration

This project includes comprehensive VS Code configuration:

- **Settings**: Optimized for TypeScript and Tailwind development
- **Extensions**: Recommended extensions for the best development experience
- **Launch Config**: Debug configurations for backend debugging
- **Snippets**: Custom code snippets for faster development

Open the project in VS Code to automatically get recommended extensions and settings.

## 🌐 Deployment

### Local Development
```bash
npm run dev
```
Access at: `http://localhost:5000`

### Production Build
```bash
npm run build
npm run start
```

### Docker Deployment
The Docker setup script creates a containerized PostgreSQL instance and provides a `start.sh` script for easy management.

## 📊 Features Overview

### Admin Dashboard
- User management (doctors, patients)
- Medicine database management
- Prescription template management
- System analytics and reporting
- Doctor permission management

### Doctor Portal
- Patient management and medical records
- Prescription creation with AI assistance
- Appointment scheduling
- Print prescriptions with assigned templates
- Personal analytics dashboard

### AI Integration
- **Medicine Suggestions**: AI-powered recommendations based on symptoms
- **Bengali Language Support**: Localized medical consultation
- **Expert Consultation**: Discuss treatment options with AI
- **Smart Matching**: Automatic medicine database integration

## 🔒 Security Features

- Session-based authentication
- Role-based access control
- Secure password hashing
- CSRF protection
- Input validation and sanitization
- Secure environment variable handling

## 📚 Documentation

- [Local Setup Guide](LOCAL_SETUP.md) - Detailed setup instructions
- [Setup Requirements](SETUP_REQUIREMENTS.md) - Quick reference guide
- [Package Requirements](package-requirements.json) - Structured requirements data

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in `.env`
   - Run `npm run db:push` to update schema

2. **Node.js Version Issues**
   - Ensure Node.js 18+ is installed
   - Use `node --version` to check

3. **Port Already in Use**
   - Change PORT in `.env` file
   - Or kill process: `lsof -ti:5000 | xargs kill -9`

4. **AI Features Not Working**
   - Verify GEMINI_API_KEY in `.env`
   - Check API key permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run type checking: `npm run check`
5. Test your changes
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with modern web technologies
- Powered by Google Gemini AI
- UI components by Radix UI and shadcn/ui
- Database management by Drizzle ORM

---

**Made with ❤️ for homeopathy clinics worldwide**

For support or questions, please refer to the documentation or create an issue.