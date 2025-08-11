/**
 * Example: Advanced ElevenLabs conversation with custom settings
 */

'use client';

import { useState } from 'react';
import { useElevenLabsConversation } from '../hooks/useElevenLabsConversation';
import { ConversationButton } from '../components/ConversationButton';
import { ConversationStatus } from '../components/ConversationStatus';

export default function AdvancedConversationExample() {
  const [selectedVoice, setSelectedVoice] = useState('default-voice-id');
  const [messages, setMessages] = useState<Array<{text: string, speaker: 'user' | 'agent'}>>([]);

  const conversation = useElevenLabsConversation({
    config: {
      apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
    },
    sessionConfig: {
      overrides: {
        tts: {
          voiceId: selectedVoice,
          stability: 0.8,
          similarity_boost: 0.6,
          style: 0.2,
          speed: 1.0,
        },
        agent: {
          firstMessage: "Hello! I'm your AI assistant. How can I help you today?"
        }
      }
    },
    onMessage: (message, speaker) => {
      setMessages(prev => [...prev, { text: message, speaker }]);
    },
    onStatusChange: (status) => {
      console.log('Status update:', status);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Advanced AI Conversation</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>
            
            {/* Voice Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Selection
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={conversation.isConnected}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="default-voice-id">Default Voice</option>
                <option value="voice-2">Professional Voice</option>
                <option value="voice-3">Casual Voice</option>
              </select>
            </div>

            {/* Conversation Button */}
            <div className="flex justify-center mb-6">
              <ConversationButton
                isConnected={conversation.isConnected}
                isConnecting={conversation.isConnecting}
                onStart={conversation.startConversation}
                onEnd={conversation.endConversation}
                size="lg"
                variant="floating"
              />
            </div>

            {/* Status */}
            <ConversationStatus
              isConnected={conversation.isConnected}
              isConnecting={conversation.isConnecting}
              error={conversation.error}
              sessionDuration={conversation.sessionDuration}
              showDuration={true}
              showDetailedStatus={true}
            />

            {/* Session Stats */}
            {conversation.isConnected && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Session Stats</h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <div>Duration: {conversation.sessionDuration}</div>
                  <div>Messages: {conversation.conversationMessages.length}</div>
                  <div>Status: {conversation.isConnected ? 'Connected' : 'Disconnected'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Conversation History */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Conversation History</h2>
            
            <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Start a conversation to see messages here</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.speaker === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        {msg.speaker === 'user' ? 'You' : 'AI Assistant'}
                      </div>
                      <div className="text-sm">{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Clear History Button */}
            {messages.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setMessages([])}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {conversation.error && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">!</span>
              </div>
              <div>
                <h3 className="font-medium text-red-800">Connection Error</h3>
                <p className="text-sm text-red-600">{conversation.error}</p>
              </div>
              <button
                onClick={conversation.clearError}
                className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-medium text-blue-800 mb-2">How to Use</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Select your preferred voice from the dropdown</li>
            <li>• Click the microphone button to start the conversation</li>
            <li>• Speak naturally - the AI will respond in real-time</li>
            <li>• Your conversation history will appear on the right</li>
            <li>• Click the button again to end the conversation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}