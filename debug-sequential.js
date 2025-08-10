// Sequential test with debug
const fetch = require('node-fetch');

async function testFlow() {
  console.log('=== SEQUENTIAL TEST ===');
  
  // Register session
  console.log('\n1. Registering session...');
  const regResp = await fetch('http://localhost:3000/api/register-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: 'test123', therapistId: 'nora-ephron' })
  });
  console.log('Registration:', await regResp.text());
  
  // Check debug immediately after
  console.log('\n2. Checking debug (should see session)...');
  const debugResp = await fetch('http://localhost:3000/api/debug-sessions');
  console.log('Debug:', await debugResp.text());
  
  // Test webhook
  console.log('\n3. Testing webhook (should find session)...');
  const webhookResp = await fetch('http://localhost:3000/api/elevenlabs-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Test message' }],
      variables: { current_topic: 'intro' }
    })
  });
  console.log('Webhook:', await webhookResp.text());
}

testFlow();