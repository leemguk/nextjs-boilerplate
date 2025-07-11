import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';
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
    // Initialize SendGrid
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      console.error('SENDGRID_API_KEY is not configured');
      return NextResponse.json({
        success: false,
        error: 'Email service is not configured'
      }, { status: 500 });
    }
    sgMail.setApiKey(sendgridApiKey);

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

    // Send emails via SendGrid
    let sentCount = 0;
    const failedEmails: { email: string; error: string }[] = [];
    
    const emailPromises = customers.map(async (customer: Customer) => {
      try {
        const personalizedSubject = subject.replace('{{customerName}}', customer.name);
        const personalizedContent = emailTemplate.replace(/{{customerName}}/g, customer.name);
        
        // Insert email record first (as pending)
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
          personalizedSubject,
          personalizedContent,
          'pending',
          user.id,
          campaignId
        ]);

        const emailId = emailResult.rows[0].id;

        // Send via SendGrid
        const msg = {
          to: customer.email,
          from: {
            email: fromEmail,
            name: displayName
          },
          subject: personalizedSubject,
          text: personalizedContent,
          html: personalizedContent.replace(/\n/g, '<br>').replace(
            /\[Leave a Review on Trustpilot\]\((.*?)\)/,
            '<a href="$1" style="background-color: #00b67a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Leave a Review on Trustpilot</a>'
          ),
          customArgs: {
            emailId: emailId.toString(),
            campaignId: campaignId.toString(),
            userId: user.id
          }
        };

        try {
          const [response] = await sgMail.send(msg);
          
          // Update email record with SendGrid message ID
          await db.query(
            'UPDATE emails SET status = $1, "sendgridMessageId" = $2 WHERE id = $3',
            ['sent', response.headers['x-message-id'], emailId]
          );
          
          sentCount++;
        } catch (sendError: any) {
          console.error(`Failed to send email to ${customer.email}:`, sendError);
          
          // Update email status to failed
          await db.query(
            'UPDATE emails SET status = $1 WHERE id = $2',
            ['failed', emailId]
          );
          
          failedEmails.push({
            email: customer.email,
            error: sendError.message || 'Unknown error'
          });
        }
      } catch (error: any) {
        console.error(`Failed to process email for ${customer.email}:`, error);
        failedEmails.push({
          email: customer.email,
          error: error.message || 'Failed to process email'
        });
      }
    });

    await Promise.all(emailPromises);

    const response: any = {
      success: sentCount > 0,
      data: {
        sent: sentCount,
        total: customers.length,
        failed: failedEmails.length,
        campaignId: campaignId,
        campaignName: campaignName || `Campaign ${new Date().toLocaleDateString()}`
      },
      message: `Successfully sent ${sentCount} out of ${customers.length} emails`
    };

    if (failedEmails.length > 0) {
      response.data.failedEmails = failedEmails;
    }

    return NextResponse.json(response, { status: sentCount > 0 ? 200 : 500 });

  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send emails'
    }, { status: 500 });
  }
}