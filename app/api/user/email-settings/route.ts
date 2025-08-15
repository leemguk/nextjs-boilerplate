import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

// Helper function to verify JWT token
function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - Load user's email settings
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get user's email settings
    const result = await db.query(
      'SELECT display_name, from_email FROM user_email_settings WHERE user_id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      // Return default settings if no settings found
      return NextResponse.json({
        success: true,
        data: {
          displayName: '',
          fromEmail: 'charlie.gilbert@ransomspares.co.uk'
        }
      });
    }

    const settings = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        displayName: settings.display_name,
        fromEmail: settings.from_email
      }
    });

  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch email settings'
    }, { status: 500 });
  }
}

// PUT - Update user's email settings
export async function PUT(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { displayName } = await request.json();

    // Validate input
    if (!displayName || !displayName.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Display name is required'
      }, { status: 400 });
    }

    // Check if settings already exist
    const existingResult = await db.query(
      'SELECT id FROM user_email_settings WHERE user_id = $1',
      [user.id]
    );

    if (existingResult.rows.length > 0) {
      // Update existing settings
      await db.query(
        'UPDATE user_email_settings SET display_name = $1, updated_at = NOW() WHERE user_id = $2',
        [displayName.trim(), user.id]
      );
    } else {
      // Insert new settings
      await db.query(
        'INSERT INTO user_email_settings (user_id, display_name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [user.id, displayName.trim()]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating email settings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update email settings'
    }, { status: 500 });
  }
}