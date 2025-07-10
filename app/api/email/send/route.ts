import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';

interface Customer {
  name: string;
  email: string;
}

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

// POST - Send review request emails
export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { customers, templateId, reviewPlatformId, campaignName } = await request.json();

    // Validate input
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customers list is required'
      }, { status: 400 });
    }

    // Validate customer format
    for (const customer of customers) {
      if (!customer.name || !customer.email) {
        return NextResponse.json({
          success: false,
          error: 'Each customer must have name and email'
        }, { status: 400 });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        return NextResponse.json({
          success: false,
          error: `Invalid email format: ${customer.email}`
        }, { status: 400 });
      }
    }

    // Get user's email settings for sender name
    const settingsResult = await db.query(
      'SELECT display_name, from_email FROM user_email_settings WHERE user_id = $1',
      [user.id]
    );

    const displayName = settingsResult.rows[0]?.display_name || 'Ransom Spares';
    const fromEmail = settingsResult.rows[0]?.from_email || 'charlie.gilbert@ransomspares.co.uk';

    // Create a new campaign
    const campaignResult = await db.query(
      'INSERT INTO campaigns (name, description, status, userid, createdat, updatedat) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
      [
        campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        `Review request campaign for ${customers.length} customers`,
        'active',
        user.id
      ]
    );

    const campaignId = campaignResult.rows[0].id;

    // Prepare email template
    const subject = `Hi {{customerName}}, how was your recent order?`;
    const emailTemplate = `Hi {{customerName}},

Thank you for your recent order with Ransom Spares!

We'd love to hear about your experience. Could you take a moment to leave us a review on Trustpilot?

[Leave a Review on Trustpilot](https://uk.trustpilot.com/review/ransomspares.co.uk)

Your feedback helps us improve and helps other customers make informed decisions.

Thank you for choosing Ransom Spares!

Best regards,
${displayName}
Ransom Spares Team`;

    // Insert email records into database (simulating email sending)
    let sentCount = 0;
    const emailPromises = customers.map(async (customer: Customer) => {
      try {
        // Insert email record
        const emailResult = await db.query(`
          INSERT INTO emails (
            "to", 
            subject, 
            content, 
            status, 
            "sentAt", 
            "userId", 
            "campaignId", 
            "createdAt", 
            "updatedAt"
          ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW(), NOW()) 
          RETURNING id
        `, [
          customer.email,
          subject.replace('{{customerName}}', customer.name),
          emailTemplate.replace(/{{customerName}}/g, customer.name),
          'sent',
          user.id,
          campaignId
        ]);

        // Simulate email delivery success (in real implementation, you'd integrate with SendGrid)
        // For now, we'll randomly mark some as delivered
        const shouldDeliver = Math.random() > 0.1; // 90% delivery rate
        
        if (shouldDeliver) {
          await db.query(
            'UPDATE emails SET status = $1, "deliveredAt" = NOW() WHERE id = $2',
            ['delivered', emailResult.rows[0].id]
          );
        }

        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to ${customer.email}:`, error);
      }
    });

    await Promise.all(emailPromises);

    return NextResponse.json({
      success: true,
      data: {
        sent: sentCount,
        total: customers.length,
        campaignId: campaignId,
        campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`
      },
      message: `Successfully queued ${sentCount} emails for sending`
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send emails'
    }, { status: 500 });
  }
}