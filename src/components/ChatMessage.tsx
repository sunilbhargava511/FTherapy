'use client';

import { Volume2, VolumeX, Pause, Play, Loader2 } from 'lucide-react';
import { ConversationMessage } from '@/lib/types';
import { useUnifiedTTS } from '@/hooks/useUnifiedTTS';

interface ChatMessageProps {
  message: ConversationMessage;
  therapistId?: string;
  useElevenLabs?: boolean;
}

export default function ChatMessage({ message, therapistId, useElevenLabs = true }: ChatMessageProps) {
  const isUser = message.speaker === 'user';
  const { speak, stop, pause, resume, isPlaying, isPaused, isLoading, error, isSupported, provider } = useUnifiedTTS(useElevenLabs);
  
  const handleSpeechToggle = () => {
    if (isPlaying) {
      if (isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      speak(message.text, therapistId || 'mel-robbins');
    }
  };

  const handleStop = () => {
    stop();
  };
  
  return (
    <div className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-therapist'}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm whitespace-pre-wrap flex-1">{message.text}</p>
          
          {/* Speech controls for therapist messages only */}
          {!isUser && isSupported && (
            <div className="flex gap-1 ml-2 mt-1">
              <button
                onClick={handleSpeechToggle}
                disabled={isLoading}
                className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title={isLoading ? 'Generating speech...' : isPlaying ? (isPaused ? 'Resume' : 'Pause') : `Play with ${provider === 'elevenlabs' ? 'ElevenLabs' : 'Browser TTS'}`}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isPlaying ? (
                  isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
              
              {(isPlaying || isLoading) && (
                <button
                  onClick={handleStop}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-red-600 transition-colors p-1 rounded disabled:opacity-50"
                  title="Stop"
                >
                  <VolumeX className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          
          {/* Error display */}
          {error && !isUser && (
            <div className="text-xs text-red-500 mt-1">
              Voice unavailable
            </div>
          )}
        </div>
      </div>
      <div className="mt-1 px-2">
        <span className="text-xs text-gray-500">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}