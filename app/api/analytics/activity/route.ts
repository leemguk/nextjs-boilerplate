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

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

// Helper function to extract name from email
function extractNameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  // Convert common patterns like john.doe to John Doe
  return localPart
    .split(/[._-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// GET - Get recent email activity
export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent email events, prioritizing most recent activity
    const activityResult = await db.query(`
      SELECT 
        id,
        "to" as customer_email,
        "sentAt",
        "deliveredAt", 
        "openedAt",
        "clickedAt",
        "bouncedAt",
        "spamAt",
        "createdAt"
      FROM emails 
      WHERE "userId" = $1 
      ORDER BY 
        GREATEST(
          COALESCE("sentAt", '1970-01-01'::timestamp),
          COALESCE("deliveredAt", '1970-01-01'::timestamp),
          COALESCE("openedAt", '1970-01-01'::timestamp),
          COALESCE("clickedAt", '1970-01-01'::timestamp),
          COALESCE("bouncedAt", '1970-01-01'::timestamp),
          COALESCE("spamAt", '1970-01-01'::timestamp)
        ) DESC
      LIMIT $2
    `, [user.id, limit]);

    const activities = activityResult.rows.map(row => {
      // Determine the most recent event and its timestamp
      const events = [
        { type: 'clicked', timestamp: row.clickedAt },
        { type: 'opened', timestamp: row.openedAt },
        { type: 'spam', timestamp: row.spamAt },
        { type: 'bounced', timestamp: row.bouncedAt },
        { type: 'delivered', timestamp: row.deliveredAt }
      ].filter(event => event.timestamp !== null)
       .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const latestEvent = events[0] || { type: 'delivered', timestamp: row.sentAt || row.createdAt };
      
      return {
        id: row.id.toString(),
        customerName: extractNameFromEmail(row.customer_email),
        customerEmail: row.customer_email,
        status: latestEvent.type.toUpperCase(),
        updatedAt: latestEvent.timestamp,
        timeAgo: getTimeAgo(new Date(latestEvent.timestamp)),
        platform: 'Trustpilot'
      };
    });

    return NextResponse.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recent activity'
    }, { status: 500 });
  }
}