# Complete ElevenLabs Conversational AI Implementation Guide

This comprehensive guide documents how to implement ElevenLabs Conversational AI with dynamic agent overrides, webhook integration, local testing with ngrok, session management, and error handling. Use this guide when building similar applications.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Dependencies & Setup](#dependencies--setup)
3. [Environment Configuration](#environment-configuration)
4. [ElevenLabs SDK Integration](#elevenlabs-sdk-integration)
5. [WebRTC Connection & Voice Handling](#webrtc-connection--voice-handling)
6. [Agent Overrides & Dynamic Configuration](#agent-overrides--dynamic-configuration)
7. [Webhook Implementation](#webhook-implementation)
8. [Local Testing with ngrok](#local-testing-with-ngrok)
9. [Session Management & Local Storage](#session-management--local-storage)
10. [OpenAI/Claude API Integration](#openaiclaude-api-integration)
11. [Error Handling & Reconnection Logic](#error-handling--reconnection-logic)
12. [Production Deployment](#production-deployment)
13. [Common Issues & Solutions](#common-issues--solutions)

## Architecture Overview

The application uses a sophisticated architecture that combines:

- **Frontend**: Next.js with React components for real-time voice UI
- **ElevenLabs SDK**: `@elevenlabs/react` and `@elevenlabs/client` for conversational AI
- **WebRTC**: Real-time bidirectional audio streaming
- **Webhook Integration**: Custom endpoint for LLM responses via Claude API
- **Session Management**: Persistent storage for conversation state
- **Dynamic Overrides**: Runtime agent voice and prompt customization

### Key Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│ ElevenLabs SDK  │◄──►│ ElevenLabs API  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Session Storage │    │   WebRTC Audio  │    │ Webhook Handler │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Claude API    │
                                               └─────────────────┘
```

## Dependencies & Setup

### Required Dependencies

```json
{
  "dependencies": {
    "@elevenlabs/client": "^0.4.4",
    "@elevenlabs/react": "^0.4.5",
    "@anthropic-ai/sdk": "^0.27.0",
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### Installation

```bash
npm install @elevenlabs/client @elevenlabs/react @anthropic-ai/sdk
```

## Environment Configuration

### Required Environment Variables

Create `.env.local`:

```bash
# Claude API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# ElevenLabs Conversational AI Agent
ELEVENLABS_AGENT_ID=your_agent_id_here
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here

# Optional: For local development with ngrok
NEXT_PUBLIC_WEBHOOK_URL=https://your-ngrok-url.ngrok.io
```

**Important Notes:**
- `ELEVENLABS_AGENT_ID` is server-side only
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is accessible on client-side
- Both should contain the same agent ID

## ElevenLabs SDK Integration

### 1. Signed URL API Endpoint

Create `src/app/api/elevenlabs-signed-url/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey || !agentId) {
      return NextResponse.json(
        { error: 'ElevenLabs credentials not configured' },
        { status: 500 }
      );
    }

    // Get a signed URL from ElevenLabs for the conversational AI
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to get signed URL' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      signedUrl: data.signed_url,
    });

  } catch (error) {
    console.error('ElevenLabs signed URL error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. API Client Wrapper

Create `src/lib/api-client.ts`:

```typescript
export const elevenLabsAPI = {
  /**
   * Get signed URL for ElevenLabs
   */
  async getSignedUrl(data: { agentId: string }) {
    return apiClient.post('/api/elevenlabs-signed-url', data);
  },

  /**
   * Convert text to speech
   */
  async textToSpeech(data: { text: string; voiceId: string; settings?: unknown }) {
    return apiClient.post('/api/elevenlabs-tts', data);
  },

  /**
   * Convert speech to text
   */
  async speechToText(data: { audio: Blob; model?: string }) {
    const formData = new FormData();
    formData.append('audio', data.audio);
    if (data.model) formData.append('model', data.model);

    return apiClient.request('/api/elevenlabs-stt', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData as any
    });
  }
};
```

## WebRTC Connection & Voice Handling

### Conversation Component Implementation

The key to successful ElevenLabs integration is properly managing the WebRTC connection:

```typescript
import { Conversation } from '@elevenlabs/react';

const startConversation = useCallback(async () => {
  try {
    setIsConnecting(true);
    
    // Request microphone permission first
    await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Get signed URL from our API
    const response = await elevenLabsAPI.getSignedUrl({ 
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID! 
    });
    
    const responseData = response.data as { signedUrl?: string; error?: string };
    if (!responseData.signedUrl) {
      throw new Error(responseData.error || 'Failed to get authorization');
    }

    // Generate dynamic first message
    const firstMessageResponse = await fetch('/api/therapist-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapistId,
        userInput: '',
        conversationContext: '',
        currentTopic: 'greeting'
      })
    });

    const { message: firstMessage } = await firstMessageResponse.json();

    // Configure session with overrides
    const sessionConfig = {
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
      connectionType: 'webrtc' as const,
      useWakeLock: true,
      overrides: {
        tts: {
          voiceId: voiceId,
          // Custom voice settings per character
          ...(therapistId === 'anita-bhargava' && {
            stability: 0.8,
            similarity_boost: 0.4,
            style: 0.1,
            use_speaker_boost: true,
            speed: 0.75 // 25% slower for this character
          })
        },
        agent: {
          firstMessage: firstMessage
        }
      }
    };

    // Start the conversation session
    const conversation = await Conversation.startSession({
      signedUrl: responseData.signedUrl,
      onConnect: () => {
        setIsConnected(true);
        setIsConnecting(false);
      },
      onMessage: (message: { message: string; source?: string }) => {
        // Handle both user speech and agent responses
        const speaker = message.source === 'user' ? 'user' : 'agent';
        onMessage?.(message.message, speaker);
      },
      onError: (error: string) => {
        console.error('Conversation error:', error);
        setIsConnected(false);
        setIsConnecting(false);
        
        // Auto-retry for network issues
        if (error.includes('timeout') || error.includes('network')) {
          setTimeout(() => {
            if (!isConnected && !isConnecting) {
              startConversation();
            }
          }, 5000);
        }
      },
      onDisconnect: (details?: { reason?: string }) => {
        setIsConnected(false);
        setIsConnecting(false);
      }
    });

    conversationRef.current = conversation;

  } catch (error) {
    console.error('Failed to start conversation:', error);
    setIsConnecting(false);
  }
}, [therapistId, voiceId, onMessage]);
```

### Critical WebRTC Configuration Details

1. **Connection Type**: Always use `'webrtc'` for best audio quality
2. **Wake Lock**: Use `useWakeLock: true` to prevent device sleep
3. **Microphone Permission**: Request BEFORE starting conversation
4. **Error Handling**: Implement auto-retry for network issues

## Agent Overrides & Dynamic Configuration

### Voice Customization

ElevenLabs allows runtime voice parameter overrides:

```typescript
const sessionConfig = {
  overrides: {
    tts: {
      voiceId: selectedVoiceId,
      stability: 0.8,        // Voice stability (0.0-1.0)
      similarity_boost: 0.4, // Voice similarity (0.0-1.0)  
      style: 0.1,           // Voice style strength (0.0-1.0)
      use_speaker_boost: true,
      speed: 0.75           // Playback speed (0.5-2.0)
    }
  }
};
```

### Dynamic Prompt/First Message

Generate dynamic first messages using your LLM:

```typescript
// Generate personalized greeting
const firstMessageResponse = await fetch('/api/therapist-response', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    therapistId: selectedTherapist,
    userInput: '',
    conversationContext: '',
    currentTopic: 'greeting'
  })
});

const { message: firstMessage } = await firstMessageResponse.json();

const sessionConfig = {
  overrides: {
    agent: {
      firstMessage: firstMessage
    }
  }
};
```

### Character-Specific Settings

Implement character-specific voice parameters:

```typescript
const getVoiceSettings = (therapistId: string) => {
  const settings = {
    'anita-bhargava': {
      stability: 0.8,
      similarity_boost: 0.4,
      style: 0.1,
      speed: 0.75 // Slower, more deliberate
    },
    'danielle-town': {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0.3,
      speed: 1.0 // Normal speed
    }
  };
  
  return settings[therapistId] || {};
};
```

## Webhook Implementation

### Core Webhook Handler

Create `src/app/api/elevenlabs-webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface ElevenLabsWebhookRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  variables?: {
    therapist_id?: string;
    current_topic?: string;
    session_id?: string;
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ElevenLabsWebhookRequest = await request.json();
    
    // Extract conversation data
    const { messages, variables = {} } = body;
    const userMessage = messages[messages.length - 1];
    
    if (!userMessage || userMessage.role !== 'user') {
      return NextResponse.json({
        content: "I didn't catch that. Could you please repeat?",
        variables
      });
    }

    // Get session info (implement your session resolution logic)
    const sessionInfo = await resolveSessionId();
    if (!sessionInfo) {
      return NextResponse.json({
        content: "I'm having trouble connecting. Please try refreshing the page.",
        variables
      });
    }

    const { therapistId } = sessionInfo;
    const userInput = userMessage.content;
    const currentTopic = variables.current_topic || 'intro';

    // Store user message for session management
    await addSessionUserMessage(sessionInfo.sessionId, userInput);

    // Generate response using your LLM
    const response = await generateTherapistResponse(
      therapistId,
      userInput,
      buildConversationContext(messages),
      currentTopic
    );

    // Determine next topic in conversation flow
    const nextTopic = determineNextTopic(currentTopic, userInput, messages);

    // Handle special cases (e.g., report generation)
    if (nextTopic === 'summary' && currentTopic !== 'summary') {
      // Generate and return summary/report
      const report = await generateReport(therapistId, messages);
      await setSessionReport(sessionInfo.sessionId, report);
      
      return NextResponse.json({
        content: generateVerbalSummary(report),
        variables: {
          ...variables,
          current_topic: 'summary',
          report_generated: true
        }
      });
    }

    return NextResponse.json({
      content: response.response,
      variables: {
        ...variables,
        current_topic: nextTopic
      }
    });

  } catch (error) {
    console.error('ElevenLabs webhook error:', error);
    return NextResponse.json({
      content: "I apologize, but I'm having a technical difficulty. Could you please try again?",
      variables: {}
    }, { status: 500 });
  }
}
```

### Topic Progression Logic

Implement conversation flow management:

```typescript
function determineNextTopic(currentTopic: string, userInput: string, messages: any[]): string {
  const topics = [
    'intro', 'name', 'age', 'interests',
    'housing_location', 'housing_preference',
    'food_preference', 'transport_preference',
    'fitness_preference', 'entertainment_preference',
    'subscriptions_preference', 'travel_preference',
    'summary'
  ];

  // Only progress if user provides substantive answer
  if (userInput.trim().length > 10) {
    const currentIndex = topics.indexOf(currentTopic);
    
    // Special logic for summary trigger
    if (currentTopic === 'travel_preference') {
      const hasEnoughData = checkDataSufficiency(messages);
      if (hasEnoughData) {
        return 'summary';
      }
      return 'travel_preference'; // Stay here
    }
    
    // Normal progression
    if (currentIndex >= 0 && currentIndex < topics.length - 1) {
      return topics[currentIndex + 1];
    }
  }

  return currentTopic;
}
```

## Local Testing with ngrok

### Setup ngrok for Local Development

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   # or download from https://ngrok.com/
   ```

2. **Start your Next.js server**:
   ```bash
   npm run dev
   ```

3. **Expose localhost in another terminal**:
   ```bash
   ngrok http 3000
   ```

4. **Update environment variables**:
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_WEBHOOK_URL=https://your-random-id.ngrok.io
   ```

### ElevenLabs Agent Configuration

In the ElevenLabs console:

1. **Go to**: https://elevenlabs.io/app/conversational-ai
2. **Create Agent** with these settings:
   - **Name**: Your App Name
   - **First Message**: "Hello! How can I help you today?"
   - **Voice**: Select your preferred voice
   - **LLM Provider**: Custom
   - **Webhook URL**: `https://your-ngrok-url.ngrok.io/api/elevenlabs-webhook`

3. **Advanced Settings** (Critical):
   - **Max Conversation Time**: 30 minutes (default is 5 minutes!)
   - **Silence Timeout**: 10 seconds
   - **Interruption Sensitivity**: Medium

### ngrok Best Practices

```bash
# Use custom subdomain (requires paid plan)
ngrok http 3000 --subdomain=myapp-dev

# Add authentication
ngrok http 3000 --basic-auth="user:password"

# Set region closest to ElevenLabs servers
ngrok http 3000 --region=us

# Keep tunnel alive with configuration file
# ~/.ngrok2/ngrok.yml
authtoken: your_auth_token
tunnels:
  myapp:
    proto: http
    addr: 3000
    subdomain: myapp-dev
```

## Session Management & Local Storage

### File-Based Session Storage

Implement persistent session storage:

```typescript
// src/lib/session-storage.ts
import { ServerFileStorage } from '@/services/storage/ServerFileStorage';

export interface SessionData {
  sessionId?: string;
  therapistId?: string;
  registeredAt?: string;
  [key: string]: unknown;
}

const storage = new ServerFileStorage();

export async function setSessionData(sessionId: string, data: SessionData): Promise<void> {
  await storage.save<SessionData>(`sessions/${sessionId}`, data);
}

export async function getSessionData(sessionId: string): Promise<SessionData | null> {
  return await storage.load<SessionData>(`sessions/${sessionId}`);
}

export async function addSessionUserMessage(sessionId: string, message: string): Promise<void> {
  const key = `sessions/messages_${sessionId}`;
  const messages = await storage.load<SessionMessage[]>(key) || [];
  messages.push({
    timestamp: new Date().toISOString(),
    message: message,
    speaker: 'user'
  });
  await storage.save<SessionMessage[]>(key, messages);
}
```

### Session Registry Pattern

Implement session resolution for webhooks:

```typescript
export async function resolveSessionId(maxRetries: number = 3): Promise<{ sessionId: string; therapistId: string } | null> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const latestSession = await getSessionData('registry_latest');
      
      if (latestSession) {
        return {
          sessionId: latestSession.frontendSessionId as string,
          therapistId: latestSession.therapistId as string
        };
      } else if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    } catch (error) {
      console.error(`Error resolving session ID (attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        return null;
      }
    }
  }
  
  return null;
}
```

### Client-Side Session Registration

```typescript
// Register session when starting conversation
const registerSession = useCallback(async (sessionId: string, therapistId: string) => {
  try {
    await fetch('/api/register-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        therapistId,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to register session:', error);
  }
}, []);
```

## OpenAI/Claude API Integration

### Dynamic Response Generation

Create a flexible therapist response system:

```typescript
// src/lib/claude-api.ts
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateTherapistResponse(
  therapistId: string,
  userInput: string,
  conversationContext: string,
  currentTopic: string
) {
  const therapist = getTherapist(therapistId);
  if (!therapist) {
    throw new Error(`Therapist not found: ${therapistId}`);
  }

  const systemPrompt = buildSystemPrompt(therapist, currentTopic);
  const userPrompt = buildUserPrompt(userInput, conversationContext, currentTopic);

  try {
    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    });

    const response = message.content[0]?.type === 'text' 
      ? message.content[0].text 
      : '';

    return {
      response: response.trim(),
      topic: currentTopic,
      therapistId
    };

  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate response');
  }
}

function buildSystemPrompt(therapist: any, currentTopic: string): string {
  return `You are ${therapist.name}, a ${therapist.personality.role}.

Background: ${therapist.biography.background}
Specialties: ${therapist.personality.specialties.join(', ')}
Communication Style: ${therapist.personality.communicationStyle}

Current conversation topic: ${currentTopic}

${getTopicSpecificInstructions(currentTopic)}

Keep responses conversational, warm, and under 100 words. Ask one focused follow-up question.`;
}

function getTopicSpecificInstructions(topic: string): string {
  const instructions = {
    'greeting': 'Start with a warm greeting and ask for their name.',
    'name': 'Acknowledge their name warmly and ask about their age.',
    'age': 'Acknowledge their age and ask about their interests/hobbies.',
    'housing_preference': 'Ask specific questions about housing costs, preferences, and trade-offs.',
    'summary': 'Provide a comprehensive analysis and ask if they want to discuss specific aspects.'
  };
  
  return instructions[topic] || 'Continue the conversation naturally based on their response.';
}
```

### Topic-Specific Response Templates

Create structured conversation flows:

```typescript
const conversationFlow = {
  'greeting': {
    systemPrompt: 'Introduce yourself warmly and ask for their name.',
    followUp: 'name',
    requiredInfo: ['greeting_given']
  },
  'name': {
    systemPrompt: 'Acknowledge their name and ask about age.',
    followUp: 'age',
    requiredInfo: ['name']
  },
  'housing_preference': {
    systemPrompt: 'Ask about housing costs, location preferences, and trade-offs.',
    followUp: 'food_preference',
    requiredInfo: ['housing_cost', 'location_preference']
  }
  // ... more topics
};
```

## Error Handling & Reconnection Logic

### Comprehensive Error Handling

```typescript
const handleConversationError = useCallback((error: string) => {
  console.error('Conversation error:', error);
  
  const errorTypes = {
    AUDIO_SILENCE: error.includes('silence'),
    TIMEOUT: error.includes('timeout'),
    NETWORK: error.includes('network'),
    DISCONNECT: error.includes('disconnect'),
    PERMISSION: error.includes('permission')
  };

  // Reset connection state
  setIsConnected(false);
  setIsConnecting(false);

  // Don't auto-retry for user-related issues
  if (errorTypes.PERMISSION || errorTypes.AUDIO_SILENCE) {
    console.log('User-related issue - not auto-retrying');
    return;
  }

  // Auto-retry for network issues
  if (errorTypes.TIMEOUT || errorTypes.NETWORK || errorTypes.DISCONNECT) {
    console.log('Network issue detected - attempting reconnection in 5 seconds');
    setTimeout(() => {
      if (!isConnected && !isConnecting) {
        startConversation();
      }
    }, 5000);
  }
}, [isConnected, isConnecting, startConversation]);
```

### Session Timeout Handling

ElevenLabs has a default 5-minute session timeout. Handle this gracefully:

```typescript
// Keep track of session duration
const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);

const setupKeepAlive = useCallback(() => {
  // Clear any existing interval
  if (keepAliveIntervalRef.current) {
    clearInterval(keepAliveIntervalRef.current);
  }

  // Set up keep-alive pings
  keepAliveIntervalRef.current = setInterval(() => {
    const now = new Date();
    const sessionMinutes = Math.floor(
      (now.getTime() - (sessionStartTime?.getTime() || now.getTime())) / 60000
    );

    // Send keep-alive at 4:30 to prevent 5-minute timeout
    if (sessionMinutes === 4 && 
        Math.floor((now.getTime() - (sessionStartTime?.getTime() || now.getTime())) % 60000 / 1000) === 30) {
      console.log('Sending keep-alive signal at 4:30');
      // Update activity timestamp or send minimal interaction
      lastActivityRef.current = new Date();
    }

    // Warn user at 9:30 for 10-minute sessions
    if (sessionMinutes === 9 && 
        Math.floor((now.getTime() - (sessionStartTime?.getTime() || now.getTime())) % 60000 / 1000) === 30) {
      console.log('Warning: Session will end soon');
      // Show user warning
    }
  }, 5000);
}, [sessionStartTime]);
```

### Graceful Disconnection

```typescript
const endConversation = useCallback(async () => {
  try {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
  } catch (error) {
    console.error('Error ending conversation:', error);
  } finally {
    setIsConnected(false);
    setIsConnecting(false);
    setSessionStartTime(null);
    
    // Clear keep-alive
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }
}, []);

// Cleanup on component unmount
useEffect(() => {
  return () => {
    if (conversationRef.current) {
      conversationRef.current.endSession().catch(console.error);
    }
  };
}, []);
```

## Production Deployment

### Environment Variables for Production

```bash
# Production environment variables
ANTHROPIC_API_KEY=your_production_api_key
ELEVENLABS_API_KEY=your_production_elevenlabs_key
ELEVENLABS_AGENT_ID=your_production_agent_id
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_production_agent_id

# Production webhook URL (must be HTTPS)
NEXT_PUBLIC_WEBHOOK_URL=https://yourapp.com
```

### Agent Configuration Updates

Update your ElevenLabs agent for production:

1. **Webhook URL**: Change from ngrok to production domain
2. **Session Duration**: Set to appropriate length (15-30 minutes)
3. **Security**: Add webhook authentication if needed
4. **Rate Limits**: Configure appropriate limits

### Production Considerations

```typescript
// Production-ready session storage
// Replace file storage with Redis or database
class ProductionSessionStorage {
  private redis: RedisClient;
  
  constructor() {
    this.redis = new RedisClient({
      url: process.env.REDIS_URL
    });
  }
  
  async setSession(sessionId: string, data: SessionData): Promise<void> {
    await this.redis.set(
      `session:${sessionId}`, 
      JSON.stringify(data),
      'EX', 
      3600 // 1 hour expiration
    );
  }
  
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
}
```

### Monitoring & Logging

```typescript
// Add comprehensive logging
import { Logger } from 'winston';

const logger = new Logger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.File({ filename: 'elevenlabs.log' }),
    new winston.transports.Console()
  ]
});

// Log all webhook requests
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  logger.info('Webhook request started', {
    requestId,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')
  });
  
  try {
    // ... handle request
    
    logger.info('Webhook request completed', {
      requestId,
      duration: Date.now() - startTime,
      status: 'success'
    });
    
  } catch (error) {
    logger.error('Webhook request failed', {
      requestId,
      duration: Date.now() - startTime,
      error: error.message,
      stack: error.stack
    });
  }
}
```

## Common Issues & Solutions

### 1. "Export ElevenLabs doesn't exist"

**Problem**: Import error with ElevenLabs client
**Solution**: Use correct import syntax

```typescript
// Wrong
import { ElevenLabs } from '@elevenlabs/client';

// Correct
import { Conversation } from '@elevenlabs/react';
```

### 2. "Agent not responding"

**Problem**: Webhook not receiving requests
**Solutions**:
- Verify ngrok URL is correct and accessible
- Check ElevenLabs agent webhook URL configuration
- Ensure webhook endpoint returns proper JSON response
- Check server logs for webhook requests

### 3. "Conversation ends after 5 minutes"

**Problem**: Default ElevenLabs session timeout
**Solution**: Update agent settings in ElevenLabs console
- Go to Agent Settings → Advanced → Max Conversation Time
- Change from 300 seconds (5 min) to 1800 seconds (30 min)

### 4. "Microphone permission denied"

**Problem**: Browser blocks microphone access
**Solutions**:
- Request permission before starting conversation
- Use HTTPS (required for microphone access)
- Add user interaction before requesting permission

```typescript
const requestMicrophoneAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Stop immediately
    return true;
  } catch (error) {
    console.error('Microphone access denied:', error);
    return false;
  }
};
```

### 5. "Session not found in webhook"

**Problem**: Session registry not working
**Solutions**:
- Implement session registration before starting conversation
- Add retry logic in session resolution
- Use persistent storage (file system or database)

### 6. "Audio quality issues"

**Problem**: Poor voice quality or dropouts
**Solutions**:
- Use `connectionType: 'webrtc'` (not 'websocket')
- Implement proper error handling and reconnection
- Check network stability and bandwidth

### 7. "Voice overrides not working"

**Problem**: Agent uses default voice instead of custom settings
**Solution**: Ensure overrides are properly structured:

```typescript
const sessionConfig = {
  overrides: {
    tts: {
      voiceId: voiceId, // Must be valid voice ID
      stability: 0.8,
      similarity_boost: 0.4
    },
    agent: {
      firstMessage: customMessage
    }
  }
};
```

### 8. "Webhook timeout errors"

**Problem**: Claude API calls taking too long
**Solutions**:
- Implement timeout handling in webhook
- Use streaming responses for long requests
- Cache common responses
- Optimize prompt engineering for faster responses

```typescript
// Add timeout to API calls
const response = await Promise.race([
  generateTherapistResponse(therapist, userInput, context, topic),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Response timeout')), 10000)
  )
]);
```

### Debug Checklist

When implementing ElevenLabs conversational AI, verify:

- [ ] Environment variables are properly set
- [ ] Webhook URL is accessible from ElevenLabs servers
- [ ] Agent configuration includes correct webhook URL
- [ ] Session timeout is set appropriately (>5 minutes)
- [ ] Microphone permissions are requested before connection
- [ ] WebRTC connection type is specified
- [ ] Error handling includes auto-retry logic
- [ ] Session management persists across webhook calls
- [ ] Voice overrides are properly formatted
- [ ] HTTPS is used in production

## Conclusion

This implementation provides a robust foundation for ElevenLabs conversational AI integration with:

- **Real-time voice conversations** via WebRTC
- **Dynamic agent configuration** with voice and prompt overrides  
- **Persistent session management** across webhook calls
- **Comprehensive error handling** with auto-reconnection
- **Local development support** with ngrok integration
- **Production-ready architecture** with monitoring and logging

The key to success is proper session management, webhook implementation, and handling the various edge cases that arise in real-time voice applications. Use this guide as a reference when building similar conversational AI applications.