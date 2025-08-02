# My Homeo Health - Complete Clinic Management System

A comprehensive homeopathy clinic management system built for modern healthcare practices. Features patient management, appointment scheduling, prescription handling, medicine inventory, and AI-powered assistance.

## 🚀 Quick Setup

### Windows Users
```cmd
# Open Command Prompt as Administrator
setup.bat
```

### Linux/macOS Users
```bash
# Make executable and run
chmod +x setup.sh
./setup.sh
```

### Quick Start (If you have Node.js & PostgreSQL)
```bash
./quick-start.sh
```

### Docker Setup
```bash
./docker-setup.sh
```

## ✨ Features

### 👥 **Patient Management**
- Complete patient records with medical history
- Demographics and contact information
- Appointment history tracking
- Prescription records

### 📅 **Appointment System**
- Doctor availability management
- Real-time scheduling with conflict prevention
- WhatsApp integration for booking
- Automated reminders and notifications

### 💊 **Medicine Inventory**
- Comprehensive medicine database
- Stock level tracking with low stock alerts
- Bulk import via CSV/Excel/PDF
- Medicine search and filtering
- Company and symptom tracking

### 📋 **Prescription Management**
- Digital prescription creation
- Pre-built templates for common conditions
- AI-powered medicine suggestions
- Multi-language support (English/Bengali)
- Professional print layouts

### 🤖 **AI Integration**
- Google Gemini powered suggestions
- Medicine recommendations based on symptoms
- Prescription template generation
- Interactive medicine discussions

### 👨‍⚕️ **Multi-Doctor Support**
- Individual doctor profiles and specializations
- Separate patient lists and appointments
- Doctor-specific medicine management
- Role-based access control

### 🔐 **Admin Panel**
- Complete system administration
- User management (Doctors, Patients, Admins)
- System statistics and reporting
- Template and configuration management

### 📱 **Modern Interface**
- Fully responsive design
- Mobile-first approach
- Progressive Web App (PWA) capabilities
- Dark/light theme support

## 🛠 What the Setup Scripts Do

### Automated Installation
- **Node.js 20+**: Automatic installation and verification
- **PostgreSQL**: Database setup with user creation
- **Dependencies**: All npm packages installed automatically
- **Database**: Schema creation and initial data

### Configuration
- **Environment Variables**: Secure generation and setup
- **Database Connection**: Automatic connection string configuration
- **Session Security**: Cryptographically secure session secrets
- **Port Management**: Automatic port conflict resolution

### AI Setup (Optional)
- **Google Gemini**: Medicine suggestions and prescription AI
- **OpenAI GPT**: Alternative AI provider
- **Anthropic Claude**: Advanced AI capabilities

### Security Features
- **Database User**: Dedicated PostgreSQL user with proper permissions
- **Session Management**: Secure HTTP-only cookies
- **Role-Based Access**: Admin, Doctor, and Patient roles
- **Input Validation**: Comprehensive data validation

## 📋 Default Credentials

After setup, access the system with:

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Access**: Full system administration

### Doctor Accounts
- **Dr. Rajesh**: `doctor` / `doctor123`
- **Dr. Ranajit**: `ranajit` / `ranajit123`
- **Access**: Patient management, prescriptions, appointments

## 🔧 Manual Setup

If the automated scripts don't work for your system:

### Prerequisites
1. **Node.js 18+**: [Download](https://nodejs.org/)
2. **PostgreSQL 13+**: [Download](https://postgresql.org/download/)
3. **Git**: [Download](https://git-scm.com/)

### Step-by-Step
```bash
# 1. Clone the repository
git clone <repository-url>
cd homeo-health

# 2. Install dependencies
npm install

# 3. Setup PostgreSQL database
createdb homeo_health
psql -d homeo_health -c "CREATE USER homeo_user WITH PASSWORD 'password';"
psql -d homeo_health -c "GRANT ALL PRIVILEGES ON DATABASE homeo_health TO homeo_user;"

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local with your database credentials

# 5. Initialize database
npm run db:push

# 6. Start the application
npm run dev
```

## 🌐 Deployment Options

### Replit (Recommended)
- Native support with automatic PostgreSQL
- Zero-configuration deployment
- Built-in database management

### Other Platforms
- **Vercel**: Frontend with external database
- **Railway**: Full-stack with PostgreSQL
- **Heroku**: Complete application hosting
- **DigitalOcean**: VPS with custom setup

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── lib/           # Utilities and helpers
├── server/                # Express.js backend
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   └── config.ts          # Server configuration
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema
├── setup.sh              # Linux/macOS setup script
├── setup.bat             # Windows setup script
├── quick-start.sh         # Quick setup for existing installs
└── docker-setup.sh       # Docker-based setup
```

## 🎯 Key Technologies

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **TanStack Query** for state management

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** for data storage
- **Session-based authentication**

### AI & Integrations
- **Google Gemini API** for AI features
- **WhatsApp Business API** for notifications
- **File processing** for bulk imports

## 🔍 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Change port in .env.local
PORT=5001
```

**Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS

# Test connection
psql -h localhost -U homeo_user -d homeo_health
```

**Permission Denied**
```bash
# Linux/macOS
chmod +x setup.sh
sudo ./setup.sh

# Windows
# Run Command Prompt as Administrator
```

### Getting Help

1. **Check Logs**: Look for detailed error messages
2. **Verify Prerequisites**: Ensure Node.js and PostgreSQL are installed
3. **Database Issues**: Confirm PostgreSQL is running and accessible
4. **Port Conflicts**: Try alternative ports
5. **File Permissions**: Ensure proper read/write access

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the setup documentation

---

**Happy Healthcare Management!** 🏥