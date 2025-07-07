import { Pool } from 'pg';

// Create a singleton connection pool
const createPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
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
