import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Track basic stats
let webhookStats = {
  totalProcessed: 0,
  totalSkipped: 0,
  lastReset: new Date()
};

// POST - Handle SendGrid webhook events (matching working Replit version)
export async function POST(request: NextRequest) {
  // ALWAYS log when webhook is called
  console.log('=== WEBHOOK CALLED ===', new Date().toISOString());
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const events = await request.json();
    console.log('Raw events:', JSON.stringify(events, null, 2));
    const eventArray = Array.isArray(events) ? events : [events];
    
    let processedCount = 0;
    let skippedCount = 0;

    for (const event of eventArray) {
      try {
        const result = await processSendGridEvent(event);
        if (result === 'processed') {
          processedCount++;
          webhookStats.totalProcessed++;
        } else {
          skippedCount++;
          webhookStats.totalSkipped++;
        }
      } catch (error) {
        console.error('Webhook event processing error:', error);
      }
    }

    // Only log if we processed review app emails
    if (processedCount > 0) {
      console.log(`📧 Processed ${processedCount} review app events`);
    }

    return NextResponse.json({ 
      processed: processedCount,
      skipped: skippedCount
    });

  } catch (error) {
    console.error('Webhook batch error:', error);
    return NextResponse.json({ error: 'Processing failed' });
  }
}

// Process SendGrid event (matching Replit logic)
async function processSendGridEvent(event: any): Promise<'processed' | 'skipped'> {
  try {
    const customerEmail = event.email;
    const eventType = event.event;
    const timestamp = event.timestamp ? new Date(event.timestamp * 1000) : new Date();

    if (!customerEmail || !eventType) {
      return 'skipped';
    }

    // Check if email exists in our review app database
    // Try to find by SendGrid message ID first (more accurate)
    let emailResult;
    if (event.sg_message_id) {
      emailResult = await db.query(`
        SELECT id, "userId", "to", status, "createdAt"
        FROM emails 
        WHERE "sendgridMessageId" = $1
        LIMIT 1
      `, [event.sg_message_id.split('.')[0]]); // SendGrid adds .filter after ID
    }

    // Fallback to email address if no message ID match
    if (!emailResult || emailResult.rows.length === 0) {
      emailResult = await db.query(`
        SELECT id, "userId", "to", status, "createdAt"
        FROM emails 
        WHERE "to" = $1
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [customerEmail]);
    }

    const emailRecord = emailResult.rows[0];

    if (!emailRecord) {
      return 'skipped'; // E-commerce email, skip silently
    }

    // Update email status
    const success = await updateEmailStatus(emailRecord.id, eventType, timestamp, customerEmail);

    // Only log important events
    if (success && ['open', 'click', 'bounce', 'spamreport'].includes(eventType)) {
      console.log(`📧 ${eventType.toUpperCase()}: ${customerEmail}`);
    }

    return 'processed';

  } catch (error) {
    throw error;
  }
}

// Update email status (matching Replit logic)
async function updateEmailStatus(
  emailId: string, 
  eventType: string, 
  timestamp: Date,
  customerEmail: string
): Promise<boolean> {
  try {
    let updateQuery = '';
    let updateParams: any[] = [];

    switch (eventType) {
      case 'delivered':
        updateQuery = `UPDATE emails SET status = $1, "deliveredAt" = $3, "updatedAt" = NOW() WHERE id = $2`;
        updateParams = ['delivered', emailId, timestamp];
        break;
      case 'open':
        updateQuery = `UPDATE emails SET status = $1, "openedAt" = $3, "openCount" = COALESCE("openCount", 0) + 1, "updatedAt" = NOW() WHERE id = $2`;
        updateParams = ['opened', emailId, timestamp];
        break;
      case 'click':
        updateQuery = `UPDATE emails SET status = $1, "clickedAt" = $3, "clickCount" = COALESCE("clickCount", 0) + 1, "updatedAt" = NOW() WHERE id = $2`;
        updateParams = ['clicked', emailId, timestamp];
        break;
      case 'bounce':
      case 'dropped':
        updateQuery = `UPDATE emails SET status = $1, "bouncedAt" = $3, "updatedAt" = NOW() WHERE id = $2`;
        updateParams = ['bounced', emailId, timestamp];
        break;
      case 'spamreport':
        updateQuery = `UPDATE emails SET status = $1, "spamAt" = $3, "updatedAt" = NOW() WHERE id = $2`;
        updateParams = ['spam', emailId, timestamp];
        break;
      case 'processed':
        return true; // Acknowledge silently
      default:
        return true; // Unknown events, ignore silently
    }

    const result = await db.query(updateQuery, updateParams);
    return (result.rowCount || 0) > 0;

  } catch (error) {
    console.error(`Database error for ${customerEmail}:`, error);
    return false;
  }
}

// GET - Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Webhook working',
    stats: webhookStats,
    timestamp: new Date().toISOString()
  });
}