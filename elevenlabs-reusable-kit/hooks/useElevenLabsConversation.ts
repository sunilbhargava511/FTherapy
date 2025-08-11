/**
 * Reusable React hook for ElevenLabs conversation management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ElevenLabsClient, ElevenLabsError } from '../lib/elevenlabs-client';
import { createErrorHandler } from '../lib/error-handling';
import { 
  ElevenLabsConfig, 
  SessionConfig, 
  ConversationCallbacks,
  ConversationError,
  KeepAliveConfig 
} from '../types/elevenlabs';

export interface UseElevenLabsConversationOptions {
  config: ElevenLabsConfig;
  sessionConfig?: Partial<SessionConfig>;
  keepAliveConfig?: Partial<KeepAliveConfig>;
  autoRetry?: boolean;
  maxRetries?: number;
  onMessage?: (message: string, speaker: 'user' | 'agent') => void;
  onError?: (error: ConversationError) => void;
  onStatusChange?: (status: string) => void;
}

export interface ConversationState {
  isConnected: boolean;
  isConnecting: boolean;
  hasPermission: boolean | null;
  sessionDuration: string;
  sessionStartTime: Date | null;
  error: string | null;
  conversationMessages: string[];
}

export function useElevenLabsConversation(options: UseElevenLabsConversationOptions) {
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isConnecting: false,
    hasPermission: null,
    sessionDuration: '00:00',
    sessionStartTime: null,
    error: null,
    conversationMessages: []
  });

  const clientRef = useRef<ElevenLabsClient | null>(null);
  const conversationRef = useRef<any>(null);
  const errorHandlerRef = useRef(createErrorHandler({
    maxRetries: options.maxRetries || 3,
    enableKeepAlive: true,
    onError: (error) => {
      setState(prev => ({ ...prev, error: error.message }));
      options.onError?.(error);
    },
    onRetry: (attempt) => {
      options.onStatusChange?.(`Reconnecting... (attempt ${attempt})`);
    },
    onKeepAlive: () => {
      console.log('Sending keep-alive signal');
    },
    onWarning: (minutesRemaining) => {
      options.onStatusChange?.(`Session will end in ${minutesRemaining} minute(s)`);
    }
  }));

  // Initialize client
  useEffect(() => {
    clientRef.current = new ElevenLabsClient(options.config);
  }, [options.config]);

  // Update session duration
  useEffect(() => {
    if (!state.sessionStartTime) return;

    const interval = setInterval(() => {
      const duration = errorHandlerRef.current.getSessionDuration();
      setState(prev => ({ ...prev, sessionDuration: duration }));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.sessionStartTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(console.error);
      }
      errorHandlerRef.current.endSession();
    };
  }, []);

  const startConversation = useCallback(async (customSessionConfig?: Partial<SessionConfig>) => {
    if (!clientRef.current || state.isConnecting || state.isConnected) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isConnecting: true, 
      error: null,
      conversationMessages: []
    }));

    options.onStatusChange?.('Requesting microphone access...');

    try {
      // Check microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setState(prev => ({ ...prev, hasPermission: true }));
      } catch (micError) {
        setState(prev => ({ ...prev, hasPermission: false }));
        throw new ElevenLabsError(
          'Microphone access is required for voice conversations',
          'MICROPHONE_DENIED'
        );
      }

      options.onStatusChange?.('Connecting to AI...');

      // Merge session configurations
      const finalSessionConfig: SessionConfig = {
        agentId: options.config.agentId,
        connectionType: 'webrtc',
        useWakeLock: true,
        ...options.sessionConfig,
        ...customSessionConfig
      };

      // Setup conversation callbacks
      const callbacks: ConversationCallbacks = {
        onConnect: () => {
          const sessionStart = new Date();
          setState(prev => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            sessionStartTime: sessionStart
          }));
          
          errorHandlerRef.current.startSession(sessionStart);
          options.onStatusChange?.('Connected - Ready to talk!');
        },
        
        onMessage: (message) => {
          const speaker = message.source === 'user' ? 'user' : 'agent';
          
          setState(prev => ({
            ...prev,
            conversationMessages: [...prev.conversationMessages, message.message]
          }));
          
          options.onMessage?.(message.message, speaker);
        },
        
        onError: (errorMessage) => {
          console.error('Conversation error:', errorMessage);
          
          const parsedError = errorHandlerRef.current.handleError(errorMessage);
          
          setState(prev => ({
            ...prev,
            error: parsedError.message,
            isConnected: false,
            isConnecting: false
          }));

          // Auto-retry for recoverable errors
          if (options.autoRetry !== false && parsedError.shouldRetry) {
            const retryDelay = parsedError.retryDelay || 5000;
            setTimeout(() => {
              if (!state.isConnected && !state.isConnecting) {
                startConversation();
              }
            }, retryDelay);
          }
        },
        
        onDisconnect: (details) => {
          const isUserInitiated = details?.reason === 'user' || details?.reason === 'user_initiated';
          
          setState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            ...(isUserInitiated && {
              sessionStartTime: null,
              sessionDuration: '00:00'
            })
          }));
          
          if (isUserInitiated) {
            errorHandlerRef.current.endSession();
          }
          
          options.onStatusChange?.(isUserInitiated ? 'Disconnected' : 'Connection lost');
        }
      };

      // Start conversation
      const conversation = await clientRef.current.startConversation(
        finalSessionConfig,
        callbacks
      );

      conversationRef.current = conversation;

    } catch (error) {
      console.error('Failed to start conversation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isConnecting: false
      }));
      
      options.onStatusChange?.('Failed to connect');
    }
  }, [state.isConnecting, state.isConnected, options]);

  const endConversation = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.endConversation();
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      sessionStartTime: null,
      sessionDuration: '00:00',
      conversationMessages: []
    }));
    
    errorHandlerRef.current.endSession();
    options.onStatusChange?.('Disconnected');
  }, [options]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const interruptTTS = useCallback(() => {
    // This would typically be implemented by the ElevenLabs SDK
    // For now, it's a placeholder
    console.log('TTS interruption requested');
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startConversation,
    endConversation,
    clearError,
    interruptTTS,
    
    // Utilities
    isReady: !!clientRef.current && !state.isConnecting,
    canStart: !state.isConnecting && !state.isConnected,
    canEnd: state.isConnected,
  };
}