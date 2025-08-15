import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Test basic connection
    const result = await db.query('SELECT NOW() as time, version() as version');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        time: result.rows[0].time,
        version: result.rows[0].version,
        ssl: db.options?.ssl ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      details: error instanceof Error ? {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      } : null
    }, { status: 500 });
  }
}