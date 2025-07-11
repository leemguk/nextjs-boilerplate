import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// SendGrid Event Types
interface SendGridEvent {
  event: 'processed' | 'dropped' | 'delivered' | 'deferred' | 'bounce' | 'open' | 'click' | 'spamreport' | 'unsubscribe' | 'group_unsubscribe' | 'group_resubscribe';
  email: string;
  timestamp: number;
  'smtp-id': string;
  sg_event_id: string;
  sg_message_id: string;
  useragent?: string;
  ip?: string;
  url?: string;
  reason?: string;
  status?: string;
  type?: string;
  category?: string[];
  asm_group_id?: number;
  // Custom args we pass when sending
  emailId?: string;
  campaignId?: string;
  userId?: string;
}

// POST - Handle SendGrid webhook events
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');
    
    // TODO: Implement signature verification if SENDGRID_WEBHOOK_VERIFICATION_KEY is set
    // For now, we'll proceed without verification
    
    const events: SendGridEvent[] = await request.json();
    
    if (!Array.isArray(events)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook payload'
      }, { status: 400 });
    }

    console.log(`Processing ${events.length} SendGrid webhook events`);

    // Process each event
    for (const event of events) {
      try {
        const { emailId, sg_message_id } = event;
        
        // Try to find the email record by custom emailId or SendGrid message ID
        let emailRecord;
        if (emailId) {
          emailRecord = await db.query(
            'SELECT id FROM emails WHERE id = $1',
            [emailId]
          );
        } else if (sg_message_id) {
          emailRecord = await db.query(
            'SELECT id FROM emails WHERE "sendgridMessageId" = $1',
            [sg_message_id]
          );
        } else {
          // Try to find by email address and approximate time
          emailRecord = await db.query(
            'SELECT id FROM emails WHERE "to" = $1 AND "sentAt" > NOW() - INTERVAL \'24 hours\' ORDER BY "sentAt" DESC LIMIT 1',
            [event.email]
          );
        }

        if (!emailRecord.rows.length) {
          console.warn(`Could not find email record for event: ${event.event} - ${event.email}`);
          continue;
        }

        const recordId = emailRecord.rows[0].id;
        const eventTime = new Date(event.timestamp * 1000);

        // Update email record based on event type
        switch (event.event) {
          case 'delivered':
            await db.query(
              'UPDATE emails SET status = $1, "deliveredAt" = $2, "sendgridMessageId" = COALESCE("sendgridMessageId", $3) WHERE id = $4',
              ['delivered', eventTime, sg_message_id, recordId]
            );
            break;

          case 'open':
            await db.query(
              'UPDATE emails SET "openedAt" = COALESCE("openedAt", $1), "openCount" = "openCount" + 1 WHERE id = $2',
              [eventTime, recordId]
            );
            break;

          case 'click':
            await db.query(
              'UPDATE emails SET "clickedAt" = COALESCE("clickedAt", $1), "clickCount" = "clickCount" + 1 WHERE id = $2',
              [eventTime, recordId]
            );
            
            // Log the clicked URL for analytics
            if (event.url) {
              console.log(`User clicked: ${event.url} in email ${recordId}`);
            }
            break;

          case 'bounce':
          case 'dropped':
            await db.query(
              'UPDATE emails SET status = $1, "bouncedAt" = $2 WHERE id = $3',
              ['bounced', eventTime, recordId]
            );
            
            // Log bounce reason
            if (event.reason) {
              console.error(`Email bounced: ${event.email} - ${event.reason}`);
            }
            break;

          case 'spamreport':
            await db.query(
              'UPDATE emails SET status = $1, "spamAt" = $2 WHERE id = $3',
              ['spam', eventTime, recordId]
            );
            break;

          case 'deferred':
            // Email is temporarily undeliverable, SendGrid will retry
            console.log(`Email deferred: ${event.email} - ${event.reason || 'Unknown reason'}`);
            break;

          case 'processed':
            // Email has been received by SendGrid and is being processed
            await db.query(
              'UPDATE emails SET status = $1, "sendgridMessageId" = COALESCE("sendgridMessageId", $2) WHERE id = $3',
              ['processing', sg_message_id, recordId]
            );
            break;

          default:
            console.log(`Unhandled event type: ${event.event} for email ${event.email}`);
        }
      } catch (error) {
        console.error(`Error processing event for ${event.email}:`, error);
        // Continue processing other events even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${events.length} events`
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook'
    }, { status: 500 });
  }
}

// GET - Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'SendGrid webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}