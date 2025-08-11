/**
 * Example: Basic ElevenLabs conversation implementation
 */

'use client';

import { VoiceConversationPanel } from '../components/VoiceConversationPanel';

export default function BasicConversationExample() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY!,
    agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
  };

  const handleMessage = (message: string, speaker: 'user' | 'agent') => {
    console.log(`${speaker}: ${message}`);
  };

  const handleStatusChange = (status: string) => {
    console.log('Status:', status);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <VoiceConversationPanel
          config={config}
          title="AI Assistant"
          description="Start a conversation with your AI assistant"
          onMessage={handleMessage}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}