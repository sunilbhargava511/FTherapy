// Quick debug script to test session registration
const fetch = require('node-fetch');

async function testSessionFlow() {
  console.log('Testing session registration flow...');
  
  try {
    // 1. Register a session
    console.log('\n1. Registering session...');
    const registerResponse = await fetch('http://localhost:3000/api/register-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'room_agent_debug_test',
        therapistId: 'nora-ephron'
      })
    });
    
    const registerResult = await registerResponse.text();
    console.log('Registration response:', registerResult);
    
    // 2. Wait a moment
    console.log('\n2. Waiting 1 second...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Test webhook
    console.log('\n3. Testing webhook...');
    const webhookResponse = await fetch('http://localhost:3000/api/elevenlabs-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello, test message' }],
        variables: { current_topic: 'intro' }
      })
    });
    
    const webhookResult = await webhookResponse.text();
    console.log('Webhook response:', webhookResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSessionFlow();