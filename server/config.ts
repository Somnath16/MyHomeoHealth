// Environment configuration for development and production alignment
export const config = {
  // Environment detection
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  
  // Server configuration
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: process.env.NODE_ENV === 'production' ? 20 : 5,
    ssl: process.env.DATABASE_URL?.includes('localhost') || 
         process.env.DATABASE_URL?.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || "homeo-health-secret-key-2025",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? 'strict' as const : 'lax' as const
  },
  
  // API configuration
  api: {
    geminiKey: process.env.GEMINI_API_KEY,
    rateLimit: process.env.NODE_ENV === 'production' ? 100 : 1000 // requests per minute
  },
  
  // File upload limits
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf'
    ]
  },
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.CLIENT_URL, /\.replit\.app$/].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true
  }
};

// Validation function to ensure required environment variables
export function validateConfig() {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Warn about optional but recommended variables
  const recommended = ['GEMINI_API_KEY', 'SESSION_SECRET'];
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missingRecommended.length > 0) {
    console.warn(`⚠️  Missing recommended environment variables: ${missingRecommended.join(', ')}`);
  }
}