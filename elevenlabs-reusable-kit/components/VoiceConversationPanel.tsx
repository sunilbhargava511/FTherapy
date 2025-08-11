/**
 * Complete voice conversation panel component
 * Combines button, status, and additional UI elements
 */

'use client';

import { ReactNode } from 'react';
import { ConversationButton } from './ConversationButton';
import { ConversationStatus } from './ConversationStatus';
import { useElevenLabsConversation } from '../hooks/useElevenLabsConversation';
import { ElevenLabsConfig, SessionConfig } from '../types/elevenlabs';

export interface VoiceConversationPanelProps {
  config: ElevenLabsConfig;
  sessionConfig?: Partial<SessionConfig>;
  title?: string;
  description?: string;
  className?: string;
  showDuration?: boolean;
  showDetailedStatus?: boolean;
  autoRetry?: boolean;
  // Callbacks
  onMessage?: (message: string, speaker: 'user' | 'agent') => void;
  onStatusChange?: (status: string) => void;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  // Custom components
  children?: ReactNode;
  // Button customization
  buttonSize?: 'sm' | 'md' | 'lg';
  buttonVariant?: 'default' | 'minimal' | 'floating';
}

export function VoiceConversationPanel({
  config,
  sessionConfig,
  title = 'Voice Conversation',
  description = 'Click the button below to start a voice conversation',
  className = '',
  showDuration = true,
  showDetailedStatus = true,
  autoRetry = true,
  onMessage,
  onStatusChange,
  onSessionStart,
  onSessionEnd,
  children,
  buttonSize = 'lg',
  buttonVariant = 'floating'
}: VoiceConversationPanelProps) {
  
  const conversation = useElevenLabsConversation({
    config,
    sessionConfig,
    autoRetry,
    onMessage,
    onStatusChange,
  });

  const handleStart = () => {
    conversation.startConversation();
    onSessionStart?.();
  };

  const handleEnd = () => {
    conversation.endConversation();
    onSessionEnd?.();
  };

  return (
    <div className={`flex flex-col items-center gap-6 p-8 ${className}`}>
      {/* Header */}
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Main Conversation Button */}
      <ConversationButton
        isConnected={conversation.isConnected}
        isConnecting={conversation.isConnecting}
        onStart={handleStart}
        onEnd={handleEnd}
        size={buttonSize}
        variant={buttonVariant}
        disabled={!conversation.canStart && !conversation.canEnd}
      />

      {/* Status Display */}
      <ConversationStatus
        isConnected={conversation.isConnected}
        isConnecting={conversation.isConnecting}
        error={conversation.error}
        sessionDuration={conversation.sessionDuration}
        showDuration={showDuration}
        showDetailedStatus={showDetailedStatus}
      />

      {/* Session Info */}
      {conversation.isConnected && (
        <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live conversation</span>
            </div>
            {showDuration && (
              <div className="flex items-center gap-2">
                <span>Duration: {conversation.sessionDuration}</span>
              </div>
            )}
          </div>
          
          {conversation.conversationMessages.length > 0 && (
            <div className="text-xs text-gray-400">
              Messages exchanged: {conversation.conversationMessages.length}
            </div>
          )}
        </div>
      )}

      {/* Microphone Permission Warning */}
      {conversation.hasPermission === false && (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm max-w-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
          <div>
            <p className="font-medium">Microphone access required</p>
            <p className="text-xs">Please enable microphone permissions to use voice features</p>
          </div>
        </div>
      )}

      {/* Custom children */}
      {children}

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-md space-y-1">
        {!conversation.isConnected && !conversation.isConnecting && (
          <>
            <p>Click the microphone button to start your conversation</p>
            <p>Make sure your microphone is enabled and working properly</p>
          </>
        )}
        {conversation.isConnecting && (
          <p>Setting up voice connection... Please wait</p>
        )}
        {conversation.isConnected && (
          <>
            <p>Speak naturally - the AI will respond in real-time</p>
            <p>Click the button again to end the conversation</p>
          </>
        )}
      </div>

      {/* Error Actions */}
      {conversation.error && (
        <div className="flex gap-2">
          <button
            onClick={conversation.clearError}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Dismiss
          </button>
          {!conversation.isConnected && (
            <button
              onClick={handleStart}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}