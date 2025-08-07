'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Loader2, AlertCircle } from 'lucide-react';
import { Conversation } from '@elevenlabs/client';
import { getTherapist } from '@/lib/therapist-loader';

interface ConversationalAIProps {
  therapistId: string;
  onMessage?: (message: string, speaker: 'user' | 'agent') => void;
  onStatusChange?: (status: string) => void;
}

export default function ConversationalAI({ therapistId, onMessage, onStatusChange }: ConversationalAIProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Disconnected');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const conversationRef = useRef<any>(null);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(console.error);
      }
    };
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setStatus('Requesting microphone access...');
      onStatusChange?.('Requesting microphone access...');

      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        setStatus('Getting authorization...');
        onStatusChange?.('Getting authorization...');
      } catch (micError) {
        setHasPermission(false);
        throw new Error('Microphone access is required for voice conversations. Please enable microphone permissions and try again.');
      }

      // Get signed URL from our API
      const response = await fetch('/api/elevenlabs-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get authorization');
      }

      const { signedUrl } = await response.json();
      setStatus('Connecting to AI therapist...');
      onStatusChange?.('Connecting to AI therapist...');

      // Start the conversation session
      const conversation = await Conversation.startSession({
        signedUrl,
        onConnect: () => {
          console.log('Connected to ElevenLabs');
          setIsConnected(true);
          setIsConnecting(false);
          setStatus('Connected - Ready to talk!');
          onStatusChange?.('Connected - Ready to talk!');
          
          // Initial greeting will come from Claude API when conversation starts
          console.log('[ELEVENLABS_CONNECTED]', new Date().toISOString(), {
            therapistId,
            note: 'Waiting for Claude API to generate initial greeting'
          });
        },
        onDisconnect: () => {
          console.log('Disconnected from ElevenLabs');
          setIsConnected(false);
          setStatus('Disconnected');
          onStatusChange?.('Disconnected');
        },
        onMessage: (message: any) => {
          console.log('Message received:', message);
          if (message?.message && message.message.trim()) {
            // Add the agent's message to chat history
            onMessage?.(message.message, 'agent');
          }
        },
        onError: (error: any) => {
          console.error('Conversation error:', error);
          const errorMessage = typeof error === 'string' 
            ? error 
            : error?.message || 'An error occurred during the conversation';
          setError(errorMessage);
          setIsConnecting(false);
          setIsConnected(false);
        },
        onStatusChange: (newStatus: any) => {
          console.log('Status changed:', newStatus);
          const statusString = typeof newStatus === 'string' ? newStatus : newStatus?.status || 'Unknown';
          setStatus(statusString);
          onStatusChange?.(statusString);
        },
        onModeChange: (mode: any) => {
          console.log('Mode changed:', mode);
          // Handle mode changes if needed
        }
      });

      conversationRef.current = conversation;

    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start conversation');
      setIsConnecting(false);
      setStatus('Failed to connect');
      onStatusChange?.('Failed to connect');
    }
  }, [therapistId, onMessage, onStatusChange]);

  const endConversation = useCallback(async () => {
    try {
      if (conversationRef.current) {
        await conversationRef.current.endSession();
        conversationRef.current = null;
      }
      setIsConnected(false);
      setStatus('Disconnected');
      onStatusChange?.('Disconnected');
    } catch (error) {
      console.error('Error ending conversation:', error);
      // Force disconnect even if there's an error
      setIsConnected(false);
      setStatus('Disconnected');
      onStatusChange?.('Disconnected');
    }
  }, [onStatusChange]);

  const toggleMute = useCallback(async () => {
    if (conversationRef.current) {
      try {
        // ElevenLabs doesn't have a direct mute function,
        // so we'll track mute state for UI purposes
        setIsMuted(!isMuted);
        // You could implement actual muting by adjusting volume
        // await conversationRef.current.setVolume({ volume: isMuted ? 0.5 : 0 });
      } catch (error) {
        console.error('Error toggling mute:', error);
      }
    } else {
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status Message */}
      <div className="text-center max-w-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Voice Conversation Mode
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Have a natural conversation with Danielle Town using your voice.
        </p>
        <p className="text-xs text-blue-600 mb-2">
          💡 Note: For full Danielle Town personality, the ElevenLabs agent needs to be configured with her coaching style and initial greeting.
        </p>
        {hasPermission === false && (
          <p className="text-xs text-orange-600 mb-2">
            📱 Microphone access required
          </p>
        )}
        <p className="text-xs font-medium text-blue-600">
          Status: {status}
        </p>
      </div>

      {/* Main Call Button */}
      <button
        onClick={isConnected ? endConversation : startConversation}
        disabled={isConnecting}
        className={`relative flex items-center gap-3 px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 ${
          isConnected 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-green-500 hover:bg-green-600 text-white'
        } ${isConnecting ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </>
        ) : isConnected ? (
          <>
            <PhoneOff className="w-5 h-5" />
            End Voice Session
          </>
        ) : (
          <>
            <Phone className="w-5 h-5" />
            Start Voice Session
          </>
        )}
      </button>

      {/* Mute Button (shown when connected) */}
      {isConnected && (
        <button
          onClick={toggleMute}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
            isMuted 
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          {isMuted ? 'Muted' : 'Unmuted'}
        </button>
      )}

      {/* Status Indicators */}
      {isConnected && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live conversation active
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        {isConnected 
          ? "🎙️ Speak naturally - your AI therapist is listening and will respond"
          : isConnecting
            ? "⏳ Setting up voice connection..."
            : "🎯 Click to start a real-time voice conversation with your AI therapist"
        }
      </div>

      {/* Fallback Link */}
      {error && !isConnecting && (
        <div className="text-xs text-gray-400 text-center">
          Having trouble? Try the voice agent directly at:{' '}
          <a 
            href={`https://elevenlabs.io/app/talk-to?agent_id=${process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || 'agent_01k0devtnafyhb7cg4ztv3gpa8'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 underline"
          >
            ElevenLabs Agent
          </a>
        </div>
      )}
    </div>
  );
}