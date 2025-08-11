/**
 * Reusable TypeScript types for ElevenLabs Conversational AI integration
 */

export interface ElevenLabsConfig {
  apiKey: string;
  agentId: string;
  baseUrl?: string;
}

export interface VoiceSettings {
  voiceId: string;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

export interface SessionConfig {
  agentId: string;
  connectionType?: 'webrtc' | 'websocket';
  useWakeLock?: boolean;
  overrides?: {
    tts?: VoiceSettings;
    agent?: {
      firstMessage?: string;
      prompt?: string;
    };
  };
}

export interface ConversationCallbacks {
  onConnect?: () => void;
  onDisconnect?: (details?: { reason?: string }) => void;
  onMessage?: (message: { message: string; source?: string }) => void;
  onError?: (error: string) => void;
  onAudio?: (audio: ArrayBuffer) => void;
}

export interface ElevenLabsWebhookRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  agent_id?: string;
  session_id?: string;
  conversation_id?: string;
  user?: string;
  safety_identifier?: string;
  prompt_cache_key?: string;
  variables?: {
    [key: string]: any;
  };
  metadata?: {
    [key: string]: any;
  };
}

export interface ElevenLabsWebhookResponse {
  content: string;
  variables?: {
    [key: string]: any;
  };
}

export interface SessionData {
  sessionId: string;
  therapistId?: string;
  userId?: string;
  registeredAt: string;
  lastActivity?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface SessionMessage {
  timestamp: string;
  message: string;
  speaker: 'user' | 'agent';
  metadata?: {
    [key: string]: any;
  };
}

export interface ConversationError {
  type: 'AUDIO_SILENCE' | 'TIMEOUT' | 'NETWORK' | 'DISCONNECT' | 'PERMISSION' | 'UNKNOWN';
  message: string;
  shouldRetry: boolean;
  retryDelay?: number;
}

export interface KeepAliveConfig {
  enabled: boolean;
  intervalMs: number;
  warningMinutes: number[];
  maxSessionMinutes: number;
}

export interface ElevenLabsClientOptions {
  config: ElevenLabsConfig;
  keepAlive?: KeepAliveConfig;
  errorRetry?: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}