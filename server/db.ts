import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";
import { config } from "./config";

if (!config.database.url) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log("Database URL configured:", config.database.url.substring(0, 30) + "...");

// Create connection pool with environment-specific settings
export const pool = new Pool({ 
  connectionString: config.database.url,
  ssl: config.database.ssl,
  max: config.database.maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Add error handling for connection issues
  onError: (err) => {
    console.error('Database pool error:', err);
  }
});

export const db = drizzle({ client: pool, schema });