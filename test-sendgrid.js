// Test script to verify SendGrid configuration
const sgMail = require('@sendgrid/mail');

// Set your API key
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.error('SENDGRID_API_KEY environment variable is not set');
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const msg = {
  to: 'lee.gilbert@ransomspares.co.uk',
  from: {
    email: 'charlie.gilbert@ransomspares.co.uk',
    name: 'Ransom Spares'
  },
  subject: 'SendGrid Test Email',
  text: 'This is a test email to verify SendGrid configuration.',
  html: '<p>This is a test email to verify SendGrid configuration.</p>',
};

console.log('Sending test email...');

sgMail
  .send(msg)
  .then((response) => {
    console.log('Email sent successfully!');
    console.log('Status:', response[0].statusCode);
    console.log('Headers:', response[0].headers);
  })
  .catch((error) => {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('Error details:', error.response.body);
    }
  });