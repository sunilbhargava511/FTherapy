'use client';

import { Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { ConversationMessage } from '@/lib/types';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

interface ChatMessageProps {
  message: ConversationMessage;
  therapistId?: string;
}

export default function ChatMessage({ message, therapistId }: ChatMessageProps) {
  const isUser = message.speaker === 'user';
  const { speak, stop, pause, resume, isPlaying, isPaused, isSupported } = useTextToSpeech();
  
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
                className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded"
                title={isPlaying ? (isPaused ? 'Resume' : 'Pause') : 'Play'}
              >
                {isPlaying ? (isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />) : <Volume2 className="w-3 h-3" />}
              </button>
              
              {isPlaying && (
                <button
                  onClick={handleStop}
                  className="text-gray-500 hover:text-red-600 transition-colors p-1 rounded"
                  title="Stop"
                >
                  <VolumeX className="w-3 h-3" />
                </button>
              )}
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