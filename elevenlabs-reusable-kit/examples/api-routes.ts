/**
 * Example API routes for ElevenLabs integration
 */

// File: app/api/elevenlabs-signed-url/route.ts
import { createSignedUrlRouteFromEnv } from '../../api/signed-url-route';
export const { POST } = createSignedUrlRouteFromEnv();

// File: app/api/elevenlabs-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  createWebhookHandler, 
  ResponseGenerator 
} from '../../api/webhook-handler';
import { createSessionManager } from '../../lib/session-manager';

// Create session manager
const sessionManager = createSessionManager('file', './data/sessions');

// Implement your response generator
class MyResponseGenerator implements ResponseGenerator {
  async generateResponse(params: {
    userInput: string;
    conversationContext: string;
    sessionId: string;
    variables: Record<string, any>;
  }) {
    // Example: Use OpenAI, Claude, or your custom LLM
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Keep responses concise and conversational.'
          },
          {
            role: 'user',
            content: params.userInput
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I'm sorry, I didn't understand that.";

    return {
      content,
      variables: {
        ...params.variables,
        last_response_timestamp: new Date().toISOString()
      }
    };
  }
}

// Create webhook handler
const webhookHandler = createWebhookHandler({
  sessionManager,
  responseGenerator: new MyResponseGenerator(),
  topics: ['greeting', 'conversation', 'farewell'],
  enableLogging: true
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  return webhookHandler.handleWebhook(request);
}

// File: app/api/register-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSessionManager } from '../../lib/session-manager';

const sessionManager = createSessionManager('file');

export async function POST(request: NextRequest) {
  try {
    const { sessionId, therapistId, timestamp } = await request.json();
    
    await sessionManager.registerSession({
      sessionId,
      therapistId,
      registeredAt: timestamp || new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register session' },
      { status: 500 }
    );
  }
}