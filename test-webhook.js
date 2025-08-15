// Test webhook manually
const fetch = require('node-fetch');

const testEvents = [
  {
    email: 'lee.gilbert@ransomspares.co.uk',
    timestamp: Math.floor(Date.now() / 1000),
    'smtp-id': '<test-smtp-id>',
    event: 'delivered',
    sg_event_id: 'test-event-id',
    sg_message_id: 'M0S27h2nRTeYW118hrbBgw',
    emailId: '4',
    campaignId: '2',
    userId: '1752219864819'
  }
];

console.log('Testing webhook with sample data...');

fetch('https://nextjs-boilerplate-git-staging-ransom-spares.vercel.app/api/webhook/sendgrid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'SendGrid Event Webhook'
  },
  body: JSON.stringify(testEvents)
})
.then(response => response.json())
.then(data => {
  console.log('Webhook response:', data);
})
.catch(error => {
  console.error('Error:', error);
});