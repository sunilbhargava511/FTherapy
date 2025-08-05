'use client';

import { ConversationMessage } from '@/lib/types';

interface ChatMessageProps {
  message: ConversationMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.speaker === 'user';
  
  return (
    <div className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-therapist'}`}>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      </div>
      <div className="mt-1 px-2">
        <span className="text-xs text-gray-500">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}