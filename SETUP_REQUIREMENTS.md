# Setup Requirements - My Homeo Health

## Quick Reference

### System Requirements
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13.0
- **npm** (comes with Node.js)

### Environment Variables Required
```env
DATABASE_URL=postgresql://user:password@host:port/database
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=your_secure_secret_key
```

### Setup Commands
```bash
# Clone and install
git clone <repository-url>
cd my-homeo-health
npm install

# Quick setup
./quick-setup.sh

# Interactive setup
./setup.sh

# Docker setup
./docker-setup.sh

# Manual database setup
npm run db:push

# Start development
npm run dev
```

### Default Login
- **Admin:** admin / admin123
- **Doctor:** ranajit / ranajit123

### Ports
- **Application:** http://localhost:5000
- **Database:** localhost:5432 (if local)

### API Keys
- **Gemini API:** [Get from Google AI Studio](https://makersuite.google.com/app/apikey)

For detailed setup instructions, see [LOCAL_SETUP.md](LOCAL_SETUP.md)