import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Simple logout - just return success
  // In a real app, you might want to invalidate tokens here
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });
}
