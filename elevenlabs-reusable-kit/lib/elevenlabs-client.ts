/**
 * Reusable ElevenLabs client wrapper with error handling and retry logic
 */

import { ElevenLabsConfig, SessionConfig, ConversationCallbacks, ConversationError } from '../types/elevenlabs';

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public shouldRetry: boolean = false
  ) {
    super(message);
    this.name = 'ElevenLabsError';
  }
}

export class ElevenLabsClient {
  private config: ElevenLabsConfig;
  private conversationRef: any = null;

  constructor(config: ElevenLabsConfig) {
    this.config = config;
  }

  async getSignedUrl(): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl || ''}/api/elevenlabs-signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: this.config.agentId
        })
      });

      if (!response.ok) {
        throw new ElevenLabsError(
          `Failed to get signed URL: ${response.statusText}`,
          'SIGNED_URL_ERROR',
          response.status,
          response.status >= 500
        );
      }

      const data = await response.json();
      
      if (!data.signedUrl) {
        throw new ElevenLabsError(
          data.error || 'No signed URL returned',
          'MISSING_SIGNED_URL',
          undefined,
          false
        );
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof ElevenLabsError) {
        throw error;
      }
      
      throw new ElevenLabsError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
        undefined,
        true
      );
    }
  }

  async startConversation(
    sessionConfig: SessionConfig,
    callbacks: ConversationCallbacks
  ): Promise<any> {
    try {
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately after permission

      // Get signed URL
      const signedUrl = await this.getSignedUrl();

      // Import Conversation SDK dynamically
      const { Conversation } = await import('@elevenlabs/react');

      // Start conversation with enhanced error handling
      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => {
          console.log('ElevenLabs conversation connected');
          callbacks.onConnect?.();
        },
        onMessage: (message: { message: string; source?: string }) => {
          console.log('ElevenLabs message:', {
            source: message.source,
            text: message.message?.substring(0, 50) + '...'
          });
          callbacks.onMessage?.(message);
        },
        onError: (error: string) => {
          console.error('ElevenLabs conversation error:', error);
          const parsedError = this.parseConversationError(error);
          callbacks.onError?.(parsedError.message);
        },
        onDisconnect: (details?: { reason?: string }) => {
          console.log('ElevenLabs conversation disconnected:', details?.reason);
          this.conversationRef = null;
          callbacks.onDisconnect?.(details);
        },
        onAudio: callbacks.onAudio,
        ...sessionConfig
      });

      this.conversationRef = conversation;
      return conversation;

    } catch (error) {
      if (error instanceof ElevenLabsError) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('microphone')) {
        throw new ElevenLabsError(
          'Microphone access is required for voice conversations',
          'MICROPHONE_DENIED',
          undefined,
          false
        );
      }

      throw new ElevenLabsError(
        `Failed to start conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONVERSATION_START_ERROR',
        undefined,
        true
      );
    }
  }

  async endConversation(): Promise<void> {
    if (this.conversationRef) {
      try {
        await this.conversationRef.endSession();
      } catch (error) {
        console.error('Error ending conversation:', error);
      } finally {
        this.conversationRef = null;
      }
    }
  }

  isConnected(): boolean {
    return this.conversationRef !== null;
  }

  private parseConversationError(error: string): ConversationError {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('silence') || errorLower.includes('no audio')) {
      return {
        type: 'AUDIO_SILENCE',
        message: 'No speech detected. Please check your microphone.',
        shouldRetry: false
      };
    }
    
    if (errorLower.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'Connection timed out. Attempting to reconnect...',
        shouldRetry: true,
        retryDelay: 5000
      };
    }
    
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return {
        type: 'NETWORK',
        message: 'Network connection lost. Attempting to reconnect...',
        shouldRetry: true,
        retryDelay: 3000
      };
    }
    
    if (errorLower.includes('disconnect')) {
      return {
        type: 'DISCONNECT',
        message: 'Connection was interrupted. Attempting to reconnect...',
        shouldRetry: true,
        retryDelay: 2000
      };
    }
    
    if (errorLower.includes('permission') || errorLower.includes('microphone')) {
      return {
        type: 'PERMISSION',
        message: 'Microphone permission is required for voice conversations.',
        shouldRetry: false
      };
    }
    
    return {
      type: 'UNKNOWN',
      message: `Conversation error: ${error}`,
      shouldRetry: false
    };
  }
}

// Utility functions for common operations
export async function textToSpeech(
  text: string, 
  voiceId: string, 
  settings?: any,
  baseUrl?: string
): Promise<ArrayBuffer> {
  const response = await fetch(`${baseUrl || ''}/api/elevenlabs-tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
      settings
    })
  });

  if (!response.ok) {
    throw new ElevenLabsError(
      `TTS failed: ${response.statusText}`,
      'TTS_ERROR',
      response.status,
      response.status >= 500
    );
  }

  return await response.arrayBuffer();
}

export async function speechToText(
  audioBlob: Blob,
  model?: string,
  baseUrl?: string
): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  if (model) formData.append('model', model);

  const response = await fetch(`${baseUrl || ''}/api/elevenlabs-stt`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new ElevenLabsError(
      `STT failed: ${response.statusText}`,
      'STT_ERROR',
      response.status,
      response.status >= 500
    );
  }

  const result = await response.json();
  return result.transcript || '';
}

// Factory function
export function createElevenLabsClient(config: ElevenLabsConfig): ElevenLabsClient {
  return new ElevenLabsClient(config);
}