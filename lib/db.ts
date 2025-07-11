import { Pool } from 'pg';

// Create a singleton connection pool
const createPool = () => {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const config: any = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  // Supabase requires SSL in production
  // The connection string format is usually: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
  if (connectionString.includes('supabase') || connectionString.includes('pooler.supabase.com')) {
    // Supabase connection pooler requires this exact SSL configuration
    config.ssl = true;
  } else if (process.env.NODE_ENV === 'production') {
    // Other providers might need different SSL settings
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  return new Pool(config);
};

// Global pool instance
const globalPool = global as unknown as { pgPool: Pool };

export const db = globalPool.pgPool || createPool();

if (process.env.NODE_ENV !== 'production') {
  globalPool.pgPool = db;
}

// Helper for queries
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV !== 'production' && duration > 1000) {
      console.log('Slow query:', { 
        query: text.substring(0, 50) + '...', 
        duration: duration + 'ms' 
      });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
