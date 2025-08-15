import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const result = await db.query('SELECT NOW() as current_time');
    
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected',
      db_time: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
