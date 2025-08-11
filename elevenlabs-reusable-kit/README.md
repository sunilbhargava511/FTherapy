# ElevenLabs Conversational AI Reusable Kit

A comprehensive, production-ready toolkit for integrating ElevenLabs Conversational AI into React/Next.js applications. This kit provides reusable components, hooks, utilities, and API handlers that solve common implementation challenges.

## 🚀 Features

- **Complete React Integration** - Ready-to-use hooks and components
- **WebRTC Voice Handling** - Real-time bidirectional audio streaming
- **Session Management** - Persistent conversation state across webhook calls
- **Error Handling & Retry Logic** - Automatic reconnection for network issues
- **Agent Override System** - Dynamic voice and prompt customization
- **Webhook Template** - Production-ready Next.js API routes
- **TypeScript Support** - Fully typed for better development experience
- **Production Ready** - Includes monitoring, logging, and error handling

## 📁 Directory Structure

```
elevenlabs-reusable-kit/
├── types/              # TypeScript type definitions
│   └── elevenlabs.ts   # Core types and interfaces
├── lib/                # Core utilities and services
│   ├── elevenlabs-client.ts      # ElevenLabs SDK wrapper
│   ├── session-manager.ts       # Session persistence
│   └── error-handling.ts        # Error handling utilities
├── hooks/              # React hooks
│   └── useElevenLabsConversation.ts  # Main conversation hook
├── components/         # Reusable React components
│   ├── ConversationButton.tsx       # Voice control button
│   ├── ConversationStatus.tsx       # Status display
│   └── VoiceConversationPanel.tsx   # Complete conversation UI
├── api/                # API route templates
│   ├── webhook-handler.ts        # Webhook processing
│   └── signed-url-route.ts       # Signed URL generation
└── examples/           # Usage examples
    ├── basic-usage.tsx           # Simple implementation
    ├── advanced-usage.tsx        # Advanced features demo
    └── api-routes.ts             # API route examples
```

## 🛠 Installation

### 1. Copy the Kit

Copy the entire `elevenlabs-reusable-kit` directory to your project:

```bash
cp -r elevenlabs-reusable-kit ./src/
```

### 2. Install Dependencies

```bash
npm install @elevenlabs/client @elevenlabs/react
```

### 3. Environment Setup

Create or update your `.env.local`:

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_agent_id
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id

# Optional: Custom API endpoints
NEXT_PUBLIC_WEBHOOK_URL=https://yourapp.com
```

## 🏗 ElevenLabs Agent Setup

Configure your ElevenLabs agent in the console:

1. **Go to**: https://elevenlabs.io/app/conversational-ai
2. **Create Agent** with:
   - **Webhook URL**: `https://yourapp.com/api/elevenlabs-webhook`
   - **Max Session Time**: 30 minutes (not the default 5!)
   - **Voice**: Your preferred voice ID
3. **Copy Agent ID** to environment variables

## 📖 Quick Start

### Basic Usage

```tsx
// pages/conversation.tsx
import { VoiceConversationPanel } from '@/elevenlabs-reusable-kit/components/VoiceConversationPanel';

export default function ConversationPage() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
  };

  return (
    <VoiceConversationPanel
      config={config}
      title="AI Assistant"
      description="Start speaking with your AI assistant"
      onMessage={(message, speaker) => {
        console.log(`${speaker}: ${message}`);
      }}
    />
  );
}
```

### API Routes Setup

```typescript
// app/api/elevenlabs-signed-url/route.ts
import { createSignedUrlRouteFromEnv } from '@/elevenlabs-reusable-kit/api/signed-url-route';
export const { POST } = createSignedUrlRouteFromEnv();

// app/api/elevenlabs-webhook/route.ts
import { createWebhookHandler } from '@/elevenlabs-reusable-kit/api/webhook-handler';
import { createSessionManager } from '@/elevenlabs-reusable-kit/lib/session-manager';
import { ResponseGenerator } from '@/elevenlabs-reusable-kit/api/webhook-handler';

const sessionManager = createSessionManager('file');

class MyResponseGenerator implements ResponseGenerator {
  async generateResponse(params) {
    // Your LLM integration here (OpenAI, Claude, etc.)
    return {
      content: "Hello! How can I help you?",
      variables: params.variables
    };
  }
}

const handler = createWebhookHandler({
  sessionManager,
  responseGenerator: new MyResponseGenerator(),
  enableLogging: true
});

export const { POST } = handler;
```

## 🎛 Advanced Usage

### Custom Hook Implementation

```tsx
import { useElevenLabsConversation } from '@/elevenlabs-reusable-kit/hooks/useElevenLabsConversation';

function MyConversationComponent() {
  const conversation = useElevenLabsConversation({
    config: {
      apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
    },
    sessionConfig: {
      overrides: {
        tts: {
          voiceId: 'custom-voice-id',
          stability: 0.8,
          similarity_boost: 0.6,
          speed: 1.0
        },
        agent: {
          firstMessage: "Hello! I'm your custom AI assistant."
        }
      }
    },
    onMessage: (message, speaker) => {
      console.log(`${speaker}: ${message}`);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    }
  });

  return (
    <div>
      <button 
        onClick={conversation.startConversation}
        disabled={!conversation.canStart}
      >
        Start Conversation
      </button>
      
      <div>Status: {conversation.isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Duration: {conversation.sessionDuration}</div>
      
      {conversation.error && (
        <div className="error">
          {conversation.error}
          <button onClick={conversation.clearError}>Clear</button>
        </div>
      )}
    </div>
  );
}
```

### Voice Customization

```tsx
const sessionConfig = {
  overrides: {
    tts: {
      voiceId: 'your-voice-id',
      stability: 0.8,        // Voice consistency (0.0-1.0)
      similarity_boost: 0.6, // Voice similarity (0.0-1.0)
      style: 0.2,           // Voice style strength (0.0-1.0)
      use_speaker_boost: true,
      speed: 0.9            // Playback speed (0.5-2.0)
    },
    agent: {
      firstMessage: "Welcome! I'm your personalized AI assistant.",
    }
  }
};
```

### Session Management

```tsx
import { createSessionManager } from '@/elevenlabs-reusable-kit/lib/session-manager';

// File-based storage
const sessionManager = createSessionManager('file', './data/sessions');

// Memory storage (for testing)
const sessionManager = createSessionManager('memory');

// Register a session
await sessionManager.registerSession({
  sessionId: 'unique-session-id',
  therapistId: 'ai-assistant',
  registeredAt: new Date().toISOString()
});

// Store messages
await sessionManager.addMessage('session-id', {
  timestamp: new Date().toISOString(),
  message: "Hello AI!",
  speaker: 'user'
});
```

## 🔧 Configuration Options

### ElevenLabsConfig

```typescript
interface ElevenLabsConfig {
  apiKey: string;          // Your ElevenLabs API key
  agentId: string;         // Your conversational AI agent ID
  baseUrl?: string;        // Custom API base URL
}
```

### SessionConfig

```typescript
interface SessionConfig {
  agentId: string;
  connectionType?: 'webrtc' | 'websocket';  // Use 'webrtc' for best quality
  useWakeLock?: boolean;                     // Prevent device sleep
  overrides?: {
    tts?: VoiceSettings;                     // Voice customization
    agent?: {
      firstMessage?: string;                 // Custom greeting
      prompt?: string;                       // System prompt override
    };
  };
}
```

### VoiceSettings

```typescript
interface VoiceSettings {
  voiceId: string;           // ElevenLabs voice ID
  stability?: number;        // 0.0-1.0, voice consistency
  similarity_boost?: number; // 0.0-1.0, voice similarity  
  style?: number;           // 0.0-1.0, style strength
  use_speaker_boost?: boolean;
  speed?: number;           // 0.5-2.0, playback speed
}
```

## 🚨 Error Handling

The kit includes comprehensive error handling:

```tsx
import { createErrorHandler } from '@/elevenlabs-reusable-kit/lib/error-handling';

const errorHandler = createErrorHandler({
  maxRetries: 3,
  enableKeepAlive: true,
  onError: (error) => {
    console.error(`${error.type}: ${error.message}`);
  },
  onRetry: (attempt) => {
    console.log(`Retry attempt ${attempt}`);
  }
});

// Error types automatically detected:
// - AUDIO_SILENCE: Microphone issues
// - TIMEOUT: Connection timeouts  
// - NETWORK: Network connectivity
// - DISCONNECT: Unexpected disconnections
// - PERMISSION: Microphone permissions
```

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Export ElevenLabs doesn't exist" | Use `import { Conversation } from '@elevenlabs/react'` |
| Conversation ends after 5 minutes | Update agent Max Session Time to 30 minutes |
| Webhook not receiving requests | Verify ngrok URL and agent configuration |
| Microphone permission denied | Use HTTPS and request permission properly |
| Session not found in webhook | Implement session registration before starting |

### Debug Checklist

- [ ] Environment variables set correctly
- [ ] Agent webhook URL points to your endpoint  
- [ ] Agent session timeout > 5 minutes
- [ ] HTTPS enabled (required for microphone)
- [ ] Session registration before conversation start
- [ ] WebRTC connection type specified

## 🌐 Local Development with ngrok

For local development, expose your localhost:

```bash
# Install ngrok
npm install -g ngrok

# Expose localhost:3000
ngrok http 3000

# Update your ElevenLabs agent webhook URL to:
# https://your-random-id.ngrok.io/api/elevenlabs-webhook
```

## 🏭 Production Deployment

### Environment Variables

```bash
# Production environment
ELEVENLABS_API_KEY=your_production_key
ELEVENLABS_AGENT_ID=your_production_agent
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_production_agent

# Database/Redis for session storage (recommended)
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
```

### Monitoring & Logging

The webhook handler includes built-in logging:

```typescript
const handler = createWebhookHandler({
  sessionManager,
  responseGenerator,
  enableLogging: true  // Enables request/response logging
});
```

### Session Storage Scaling

For production, replace file storage with Redis:

```typescript
// Implement RedisStorageAdapter
class RedisStorageAdapter implements StorageAdapter {
  async save<T>(key: string, data: T): Promise<void> {
    await redis.set(key, JSON.stringify(data), 'EX', 3600);
  }
  // ... implement other methods
}

const sessionManager = new SessionManager(new RedisStorageAdapter());
```

## 📝 Examples

Check the `examples/` directory for:

- **basic-usage.tsx**: Simple conversation panel
- **advanced-usage.tsx**: Full-featured implementation with voice selection
- **api-routes.ts**: Complete API route setup

## 🤝 Contributing

This kit is designed to be extended and customized for your specific needs. Common customization points:

1. **Response Generation**: Implement `ResponseGenerator` for your LLM
2. **Session Storage**: Create custom `StorageAdapter` implementations  
3. **UI Components**: Extend or replace the provided React components
4. **Error Handling**: Add custom error types and handling logic

## 📄 License

MIT License - feel free to use in your projects.

## 🆘 Support

For issues specific to this kit:
1. Check the troubleshooting section
2. Review the comprehensive implementation guide
3. Examine the working examples
4. Test with the basic usage first

For ElevenLabs API issues:
- Consult the [ElevenLabs documentation](https://docs.elevenlabs.io)
- Check your agent configuration in the ElevenLabs console

---

**Made for developers building conversational AI applications with ElevenLabs.** This kit contains battle-tested solutions for the most common implementation challenges.