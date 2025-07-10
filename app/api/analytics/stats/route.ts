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

// GET - Get email analytics/stats
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
    const timeRange = searchParams.get('timeRange') || '30d';
    
    // Calculate date range
    const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get email statistics for the time range
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN status = 'sent' OR "sentAt" IS NOT NULL THEN 1 END) as emails_sent,
        COUNT(CASE WHEN "deliveredAt" IS NOT NULL THEN 1 END) as delivered,
        COUNT(CASE WHEN "openedAt" IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN "clickedAt" IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN "bouncedAt" IS NOT NULL THEN 1 END) as bounced,
        COUNT(CASE WHEN "spamAt" IS NOT NULL THEN 1 END) as spam,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM("openCount") as total_opens,
        SUM("clickCount") as total_clicks
      FROM emails 
      WHERE "userId" = $1 AND "createdAt" >= $2
    `, [user.id, startDate]);

    // Get monthly usage (current month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyResult = await db.query(`
      SELECT COUNT(*) as monthly_emails
      FROM emails 
      WHERE "userId" = $1 AND "createdAt" >= $2
    `, [user.id, monthStart]);

    const stats = statsResult.rows[0];
    const monthlyStats = monthlyResult.rows[0];

    // Calculate rates
    const emailsSent = parseInt(stats.emails_sent) || 0;
    const delivered = parseInt(stats.delivered) || 0;
    const opened = parseInt(stats.opened) || 0;
    const clicked = parseInt(stats.clicked) || 0;
    const bounced = parseInt(stats.bounced) || 0;
    const spam = parseInt(stats.spam) || 0;
    const failed = parseInt(stats.failed) || 0;
    const monthlyEmails = parseInt(monthlyStats.monthly_emails) || 0;

    const deliveryRate = emailsSent > 0 ? ((delivered / emailsSent) * 100).toFixed(1) : '0.0';
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0.0';
    const clickRate = delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : '0.0';
    
    const monthlyLimit = 1000; // Set your monthly limit
    const usagePercentage = ((monthlyEmails / monthlyLimit) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      data: {
        emailsSent,
        delivered,
        opened,
        clicked,
        bounced,
        spam,
        failed,
        monthlyLimit,
        monthlyEmails,
        deliveryRate: parseFloat(deliveryRate),
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        usagePercentage: parseFloat(usagePercentage),
        timeRange
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics'
    }, { status: 500 });
  }
}