'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Download, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { useConversation } from '@elevenlabs/react';
import { ConversationEngine } from '@/lib/conversation-engine';
import type { TherapistPersonality, UserProfile } from '@/lib/types';
import type { QualitativeReport, QuantitativeReport } from '@/core/notebook/types';

// Voice mapping for each therapist (same as TTS)
const THERAPIST_VOICES: Record<string, string> = {
  'danielle-town': 'ThT5KcBeYPX3keUQqHPh', // Dorothy - warm, intelligent female
  'aja-evans': 'oWAxZDx7w5VEj9dCyTzz', // Grace - nurturing female  
  'ramit-sethi': 'VR6AewLTigWG4xSOukaG', // Josh - confident male
  'nora-ephron': 'EXAVITQu4vr4xnSDxMaL', // Bella - witty female
  'anita-bhargava': 'mLO3zRzNWGT6HtmIOcOQ', // Updated voice for Anita
  // Backup bench therapists
  'shakespeare': 'onwK4e9ZLuTAKqWW03F9', // Daniel - distinguished English gentleman
  'trevor-noah': 'N2lVS1w4EtoT3dr4eOWO', // Callum - warm, articulate male with slight accent
  'peter-lynch': 'douDhHvfoViWmZth0cUX', // Updated male voice for Peter Lynch
  'michelle-obama': 'XB0fDUnXU5powFXDhCwa', // Charlotte - elegant, inspiring female
  'mel-robbins': 'jBpfuIE2acCO8z3wKNLl', // Freya - energetic, motivational female
};

interface ConversationModeProps {
  therapistId: string;
  therapist: TherapistPersonality;
  onMessage?: (message: string, speaker: 'user' | 'agent') => void;
  onNoteGenerated?: (note: string) => void;
  onProfileUpdate?: (profileData: Partial<UserProfile>) => void;
  onReportGenerated?: (report: any) => void;
}

export default function ConversationMode({ 
  therapistId, 
  therapist, 
  onMessage,
  onNoteGenerated,
  onProfileUpdate,
  onReportGenerated 
}: ConversationModeProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [isInSummary, setIsInSummary] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const isCleaningUp = useRef(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState<string>('00:00');
  const lastActivityRef = useRef<Date>(new Date());
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [conversationEngine, setConversationEngine] = useState<ConversationEngine | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string>('intro');

  // Set up Server-Sent Events for report notifications
  useEffect(() => {
    if (sessionId) {
      const eventSource = new EventSource(`/api/session-events?id=${sessionId}`);
      
      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'user_message' && data.message && conversationEngine) {
            
            // NOTE: User messages are now properly handled by ElevenLabs callback with source attribution
            // Processing via SSE would create duplicates, so we skip this
            // The ConversationEngine profile updates will happen via the ElevenLabs flow
          }
          
          if (data.type === 'show_report' && data.report) {
            console.log('📊 Report received via SSE for session:', sessionId);
            console.log('📊 Report summary:', {
              hasQuantitative: !!data.report.quantitative,
              hasQualitative: !!data.report.qualitative,
              timestamp: data.report.timestamp,
              reportSize: JSON.stringify(data.report).length
            });
            setReport(data.report);
            setShowReport(true);
            setIsInSummary(true);
            onReportGenerated?.(data.report);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      });
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
      };
      
      return () => {
        eventSource.close();
      };
    }
  }, [sessionId]); // onReportGenerated intentionally omitted to prevent SSE reconnections

  // Initialize ConversationEngine
  useEffect(() => {
    const engine = new ConversationEngine(therapist);
    setConversationEngine(engine);
    console.log('📚 ConversationEngine initialized for:', therapist.name);
    
    return () => {
      console.log('🔄 ConversationMode component will unmount');
    };
  }, [therapist]);

  // Session duration tracking
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - sessionStartTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setSessionDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        
        // Warn if approaching common timeout limits
        if (minutes >= 9 && seconds >= 30) {
          console.log('⚠️ Session approaching 10 minute mark - common timeout limit');
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, sessionStartTime]);

  // Debug therapist props
  useEffect(() => {
  }, [therapistId, therapist]);

  // Helper function to generate therapist notes for voice conversations
  const generateTherapistNotesForVoice = async (userMessage: string, currentTopic: string) => {
    if (!onNoteGenerated || !conversationEngine) return;

    try {
      console.log('🧠 Generating therapist notes for voice message:', userMessage.substring(0, 50) + '...');
      
      // Build conversation context from conversation messages
      const conversationContext = JSON.stringify({
        userProfile: conversationEngine.getUserProfile(),
        currentTopic,
        messageCount: conversationMessages.length
      });

      // Call the same API that chat mode uses for note generation
      const response = await fetch('/api/therapist-voice-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId: therapistId,
          userInput: userMessage,
          conversationContext,
          currentTopic
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Generate notes if provided by Claude
        if (result.note) {
          console.log('📝 Generated therapist note:', result.note);
          onNoteGenerated(result.note);
        }

        // Update profile if provided
        if (result.profileUpdate && onProfileUpdate) {
          console.log('👤 Updating profile from Claude response:', result.profileUpdate);
          onProfileUpdate(result.profileUpdate);
        }
      } else {
        console.warn('⚠️ Failed to generate therapist notes:', response.status);
      }
    } catch (error) {
      console.error('❌ Error generating therapist notes for voice:', error);
    }
  };

  // Check if API key is available
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      console.error('❌ NEXT_PUBLIC_ELEVENLABS_API_KEY is not set!');
    }
    if (!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID) {
      console.error('❌ NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set!');
    }
  }, []);

  const conversation = useConversation({
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
    onConnect: async ({ conversationId }: { conversationId: string }) => {
      console.log('✅ Connected to ElevenLabs:', {
        conversationId,
        timestamp: new Date().toISOString(),
        previousState: { isConnected, isConnecting, sessionId }
      });
      
      // Register the session with our backend for webhook mapping (URGENT - do this first)
      try {
        console.log('🔗 Registering session IMMEDIATELY:', { conversationId, therapistId });
        
        console.log('📤 Calling register-session API with:', { conversationId, therapistId });
        
        const response = await fetch('/api/register-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: conversationId,
            therapistId: therapistId
          }),
        });
        
        console.log('📥 Register-session response:', { status: response.status, ok: response.ok });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Session registered successfully:', { conversationId, therapistId, result });
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to register session:', { status: response.status, errorText });
          // Don't fail the connection, but log the issue
        }
      } catch (error) {
        console.error('❌ Error registering session:', error);
        // Don't fail the connection, but log the issue
      }
      
      setSessionId(conversationId);
      setIsConnected(true);
      setIsConnecting(false);
      setSessionStartTime(new Date());
      lastActivityRef.current = new Date();
      
      // Start keep-alive monitoring
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      
      keepAliveIntervalRef.current = setInterval(() => {
        const now = new Date();
        const timeSinceActivity = now.getTime() - lastActivityRef.current.getTime();
        
        // Log activity status every 30 seconds
        if (timeSinceActivity > 30000) {
          console.log('📊 Connection health check:', {
            timeSinceLastActivity: Math.floor(timeSinceActivity / 1000) + 's',
            sessionDuration: sessionDuration,
            status: conversation.status
          });
        }
        
        // Warn if approaching silence timeout
        if (timeSinceActivity > 8000 && timeSinceActivity < 10000) {
          console.log('⚠️ Approaching 10s silence timeout - consider prompting user');
        }
        
        // Check for 5-minute session limit
        const sessionMinutes = Math.floor((now.getTime() - (sessionStartTime?.getTime() || now.getTime())) / 60000);
        if (sessionMinutes >= 4 && sessionMinutes < 5) {
          console.log('⚠️ Approaching 5-minute session limit');
        }
        
        // Send keep-alive if approaching timeout
        if (sessionMinutes === 4 && Math.floor((now.getTime() - (sessionStartTime?.getTime() || now.getTime())) % 60000 / 1000) === 45) {
          console.log('🔄 Sending keep-alive signal at 4:45');
          // Trigger a small interaction to reset timeout
          lastActivityRef.current = new Date();
        }
      }, 5000); // Check every 5 seconds
    },
    onDisconnect: (details?: { reason?: string }) => {
      // Check if this is a real disconnect or component cleanup
      const isUserInitiated = details?.reason === 'user' || details?.reason === 'user_initiated';
      const isCleanup = !isConnected && !sessionId; // Already cleaned up
      
      console.log('📞 Disconnect event:', {
        reason: details?.reason || 'unknown',
        isUserInitiated,
        isCleanup,
        timestamp: new Date().toISOString(),
        connectionState: { isConnected, isConnecting, sessionId },
        sessionDuration: sessionDuration
      });
      
      // Clear keep-alive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      // Only reset state if this is an unexpected disconnect
      if (!isUserInitiated && !isCleanup) {
        console.log('❌ Unexpected disconnect - resetting connection state');
        setSessionId(null);
        setIsConnected(false);
        setIsConnecting(false);
        setSessionStartTime(null);
        setSessionDuration('00:00');
      } else if (isUserInitiated) {
        console.log('✅ User-initiated disconnect');
        setSessionId(null);
        setIsConnected(false);
        setIsConnecting(false);
        setSessionStartTime(null);
        setSessionDuration('00:00');
      }
    },
    onMessage: (message: { message: string; source?: string }) => {
      console.log('🎤 Agent message received from ElevenLabs:', {
        text: message.message?.substring(0, 50) + '...',
        source: message.source,
        fullMessage: message
      });
      lastActivityRef.current = new Date(); // Update activity timestamp
      
      if (message.message && message.message.trim()) {
        const messageText = message.message.trim();
        setConversationMessages(prev => [...prev, messageText]);
        
        // ElevenLabs processes both user speech and agent responses through this callback
        // Check the source field to determine the actual speaker
        const speaker = message.source === 'user' ? 'user' : 'agent';
        console.log('📝 Calling onMessage callback:', {
          source: message.source,
          speaker,
          text: messageText.substring(0, 50) + '...'
        });
        
        // Handle ConversationEngine profile updates for user messages
        if (speaker === 'user' && conversationEngine) {
          try {
            const oldTopic = conversationEngine.getCurrentTopic();
            conversationEngine.updateUserProfile(messageText);
            const newTopic = conversationEngine.getCurrentTopic();
            
            console.log('✅ Profile updated with user message', {
              message: messageText.substring(0, 50) + '...',
              topicProgression: oldTopic !== newTopic ? `${oldTopic} → ${newTopic}` : oldTopic,
              profile: {
                name: conversationEngine.getUserProfile()?.name,
                age: conversationEngine.getUserProfile()?.age
              }
            });

            // Generate therapist notes using Claude API for voice conversations
            generateTherapistNotesForVoice(messageText, newTopic);
            
            // Check for report generation
            const profile = conversationEngine.getUserProfile();
            if (profile) {
              checkAndGenerateReport(profile);
            }
          } catch (error) {
            console.error('Error updating profile with user message:', error);
          }
        }
        
        onMessage?.(messageText, speaker);
        
        // Check if we're moving to summary phase
        if (messageText.includes('comprehensive financial analysis') || 
            messageText.includes('report is now being displayed')) {
          setIsInSummary(true);
        }
      }
    },
    onError: (error: string) => {
      console.error('🔴 Conversation error:', error);
      console.error('Error details:', {
        timestamp: new Date().toISOString(),
        connectionState: { isConnected, isConnecting, sessionId },
        errorType: error.includes('silence') ? 'AUDIO_SILENCE' :
                   error.includes('timeout') ? 'TIMEOUT' :
                   error.includes('network') ? 'NETWORK' :
                   error.includes('disconnect') ? 'DISCONNECT' :
                   error.includes('permission') ? 'PERMISSION' :
                   'UNKNOWN'
      });
      
      // Reset connection states on error
      setIsConnected(false);
      setIsConnecting(false);
      
      // Don't auto-retry for permission or silence errors
      if (error.includes('permission') || error.includes('silence')) {
        console.log('🔇 Audio/permission issue detected - not auto-retrying');
        return;
      }
      
      // Auto-retry connection after a brief delay if it was a network/timeout issue
      if (error.includes('timeout') || error.includes('network') || error.includes('disconnect') || error.includes('close')) {
        console.log('🔄 Connection lost, attempting to reconnect in 5 seconds...');
        setTimeout(() => {
          if (!isConnected && !isConnecting) {
            console.log('🔄 Attempting reconnection...');
            startConversation();
          }
        }, 5000);
      }
    },
    // Add the onAudio callback that the SDK expects
    onAudio: (audio: { audio: string; isFinal: boolean }) => {
      // Audio data is base64 encoded audio chunks
      // Update activity when user speaks (user messages processed via webhook/SSE)
      if (audio.isFinal) {
        lastActivityRef.current = new Date(); // User is speaking
        console.log('🎤 User audio activity detected');
      }
    },
    // Add onDebug callback to prevent "onDebug is not a function" error
    onDebug: (info: unknown) => {
    }
  } as any);

  // Cleanup on component unmount only
  useEffect(() => {
    return () => {
      // Only end session if we're actually connected when unmounting and not already cleaning up
      if (conversation.status === 'connected' && !isCleaningUp.current) {
        isCleaningUp.current = true;
        console.log('Component unmounting - ending active session');
        conversation.endSession()
          .catch(console.error)
          .finally(() => {
            isCleaningUp.current = false;
          });
      }
    };
  }, []); // Empty dependency array - only run on unmount

  const startConversation = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting || isConnected) {
      console.log('Already connecting or connected, skipping startConversation');
      return;
    }

    // Check for API key
    if (!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      console.error('❌ ElevenLabs API key not found. Please add NEXT_PUBLIC_ELEVENLABS_API_KEY to your .env.local file');
      alert('ElevenLabs API key not configured. Please check your environment variables.');
      return;
    }

    console.log('🚀 Starting conversation - setting isConnecting=true');
    
    try {
      setIsConnecting(true);
      console.log('🎭 Starting conversation with therapist:', therapistId);
      
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get voice ID for the selected therapist
      const voiceId = THERAPIST_VOICES[therapistId] || 'ThT5KcBeYPX3keUQqHPh'; // Default to Dorothy
      
      console.log(`Generating first message for therapist ${therapistId} with voice ${voiceId}`);
      
      // Generate unified first message using server-side API
      const firstMessageResponse = await fetch('/api/generate-first-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ therapist }),
      });

      if (!firstMessageResponse.ok) {
        throw new Error('Failed to generate first message');
      }

      const { message: firstMessage } = await firstMessageResponse.json();
      
      console.log('Generated first message:', firstMessage);
      
      // Log configuration being used
      const sessionConfig = {
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: 'webrtc' as const, // Re-enabled for better audio quality
        useWakeLock: true, // Keep device awake during conversation
        // Optional: connectionDelay if needed for stability
        overrides: {
          tts: {
            voiceId: voiceId,
            ...(therapistId === 'anita-bhargava' && {
              stability: 0.8,
              similarity_boost: 0.4,
              style: 0.1,
              use_speaker_boost: true,
              speed: 0.75 // 25% slower for Anita
            })
          },
          agent: {
            firstMessage: firstMessage
          }
        }
      };
      
      console.log('📡 Starting session with config:', {
        agentId: sessionConfig.agentId,
        connectionType: sessionConfig.connectionType || 'default',
        voiceId: sessionConfig.overrides.tts.voiceId,
        hasFirstMessage: !!sessionConfig.overrides.agent.firstMessage,
        apiKeyPresent: !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      });
      
      // Start the conversation with simplified configuration
      const result = await conversation.startSession(sessionConfig);
      
      console.log('✅ Conversation started successfully with result:', result);
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsConnecting(false);
      if (error instanceof Error && error.message.includes('microphone')) {
        alert('Microphone access is required for voice conversations. Please enable microphone permissions and try again.');
      }
    }
  }, [conversation, therapistId, therapist, isConnecting, isConnected]);

  const endConversation = useCallback(async () => {
    console.log('endConversation called - current state:', { isConnected, isConnecting, sessionId });
    
    // Prevent multiple cleanup attempts
    if (isCleaningUp.current) {
      console.log('Already cleaning up, skipping');
      return;
    }
    
    try {
      // Clear keep-alive interval
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      if (isConnected) {
        isCleaningUp.current = true;
        console.log('Ending active conversation session');
        await conversation.endSession();
        console.log('Conversation ended successfully');
      } else {
        console.log('No active conversation to end');
      }
      
      // Always reset state regardless of previous connection status
      setIsConnected(false);
      setIsConnecting(false);
      setSessionId(null);
      setSessionStartTime(null);
      setSessionDuration('00:00');
    } catch (error) {
      console.error('Error ending conversation:', error);
      // Still reset state even if endSession fails
      setIsConnected(false);
      setIsConnecting(false);
      setSessionId(null);
      setSessionStartTime(null);
      setSessionDuration('00:00');
    } finally {
      isCleaningUp.current = false;
    }
  }, [conversation, isConnected, isConnecting, sessionId]);

  // Check and generate financial report when profile is complete
  const checkAndGenerateReport = useCallback(async (profile: UserProfile) => {
    console.log('🔍 CheckAndGenerateReport called:', {
      hasProfile: !!profile,
      hasReport: !!report,
      profileName: profile?.name,
      profileAge: profile?.age,
      hasLifestyle: !!profile?.lifestyle
    });
    
    if (!profile || report) {
      console.log('⚠️ Skipping report generation:', !profile ? 'No profile' : 'Report already exists');
      return; // Don't regenerate if report exists
    }
    
    // Check if we have enough lifestyle data
    const lifestyle = profile.lifestyle;
    if (!lifestyle) {
      console.log('⚠️ No lifestyle data in profile, skipping report');
      return;
    }
    
    const requiredFields = ['housing', 'food', 'transport', 'fitness', 'entertainment', 'subscriptions', 'travel'];
    const completedFields = requiredFields.filter(field => 
      (lifestyle as any)[field] && (lifestyle as any)[field].preference && (lifestyle as any)[field].preference.trim() !== ''
    );
    
    
    // Generate report when we have at least 6 out of 7 categories
    if (completedFields.length >= 6 && profile.name && profile.age) {
      console.log('📊 Generating financial report for profile:', profile.name);
      try {
        const response = await fetch('/api/generate-financial-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userProfile: profile
          }),
        });

        if (response.ok) {
          const generatedReport = await response.json();
          setReport(generatedReport);
          setShowReport(true);
          onReportGenerated?.(generatedReport);
          console.log('✅ Financial report generated successfully');
        } else {
          console.error('Failed to generate financial report');
        }
      } catch (error) {
        console.error('Error generating financial report:', error);
      }
    }
  }, [report, onReportGenerated]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    
    // Create a downloadable report (simplified for now)
    const reportData = JSON.stringify(report, null, 2);
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${('generatedAt' in report ? new Date(report.generatedAt).getTime() : Date.now())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report]);

  // Check for configuration issues
  const hasConfigError = !process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || !process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Configuration Error Alert */}
      {hasConfigError && (
        <div className="absolute top-0 left-0 right-0 bg-red-50 border-b border-red-200 p-3 z-50">
          <p className="text-red-800 font-medium text-sm">⚠️ Configuration Error</p>
          <p className="text-red-600 text-xs mt-1">
            {!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY && 'Missing NEXT_PUBLIC_ELEVENLABS_API_KEY. '}
            {!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID && 'Missing NEXT_PUBLIC_ELEVENLABS_AGENT_ID. '}
            Check your .env.local file.
          </p>
        </div>
      )}
      
      {/* Voice Interface */}
      <div className="flex-1 max-w-md mx-auto lg:mx-0">
        <div className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-10 rounded-2xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 opacity-5 rounded-2xl animate-pulse" />
          
          {/* Main Content */}
          <div className="relative flex flex-col items-center gap-6 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
            {/* Therapist Info */}
            <div className="text-center max-w-lg">
              <p className="text-2xl font-bold text-gray-800 mb-2">
                {therapist.name}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {therapist.biography.background}
              </p>
              <p className="text-xs text-blue-600 mb-2">
                💡 ElevenLabs Conversation Mode - Natural voice interaction
              </p>
            </div>

            {/* Main Call Button */}
            <div className="relative">
              {/* Status indicators */}
              {conversation.status === 'connected' && (
                <>
                  <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-400 opacity-20 animate-ping" />
                  <div className="absolute inset-0 w-32 h-32 rounded-full bg-green-400 opacity-10 animate-ping animation-delay-200" />
                </>
              )}
              
              <button
                onClick={isConnected ? endConversation : startConversation}
                disabled={isConnecting}
                className={`relative flex items-center justify-center w-32 h-32 rounded-full font-medium transition-all transform hover:scale-110 ${
                  isConnected
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                } ${isConnecting ? 'opacity-75 cursor-not-allowed' : ''} shadow-2xl`}
              >
                <div className="flex flex-col items-center">
                  {isConnecting ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : isConnected ? (
                    <PhoneOff className="w-12 h-12" />
                  ) : (
                    <Phone className="w-12 h-12" />
                  )}
                </div>
              </button>
            </div>

            {/* Status Display */}
            <div className="flex flex-col items-center gap-3">
              {conversation.status === 'connecting' ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to {therapist.name}...
                </div>
              ) : conversation.status === 'connected' ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live conversation active • {sessionDuration}
                  </div>
                  {conversation.isSpeaking && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      {therapist.name} is speaking
                    </div>
                  )}
                  {sessionDuration >= '04:30' && sessionDuration < '05:00' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
                      ⚠️ Session approaching 5-minute limit - save your progress!
                    </div>
                  )}
                  {sessionDuration >= '09:30' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      ⚠️ Session may timeout soon (10 min limit on some plans)
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  Ready to connect
                </div>
              )}
            </div>

            {/* Enhanced Instructions with State */}
            <div className="text-xs text-center max-w-xs space-y-2">
              <div className={`${conversation.status === 'connected' ? 'text-green-600' : conversation.status === 'connecting' ? 'text-blue-600' : 'text-gray-500'} font-medium`}>
                {conversation.status === 'connected' 
                  ? "🎙️ Voice conversation active"
                  : conversation.status === 'connecting'
                    ? "⏳ Connecting to therapist..."
                    : "🎯 Ready to connect"
                }
              </div>
              
              {conversation.status === 'connected' && (
                <div className="text-gray-500">
                  Speak naturally - {therapist.name} is listening and will respond. No buttons needed!
                </div>
              )}
              
              {conversation.status === 'disconnected' && (
                <div className="text-gray-500">
                  Click the call button above to start your financial coaching session
                </div>
              )}
              
              {sessionId && (
                <div className="text-xs text-gray-400 font-mono">
                  Session: {sessionId.split('_').pop()?.substring(0, 8)}...
                </div>
              )}
            </div>

            {/* Enhanced Profile Building Status */}
            {conversationEngine && isConnected && !isInSummary && (
              <div className="w-full max-w-sm bg-purple-50/80 backdrop-blur-sm p-3 rounded-xl border border-purple-200/50 shadow-sm">
                <p className="text-xs text-purple-600 font-medium mb-2">Building Your Financial Profile</p>
                {(() => {
                  const profile = conversationEngine.getUserProfile();
                  const hasName = profile?.name;
                  const hasAge = profile?.age;
                  const lifestyle = profile?.lifestyle || {};
                  const lifestyleCategories = ['housing', 'food', 'transport', 'fitness', 'entertainment', 'subscriptions', 'travel'];
                  const completedCategories = lifestyleCategories.filter(cat => (lifestyle as any)[cat]?.preference);
                  
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center text-xs">
                        <span className={hasName ? 'text-green-600' : 'text-gray-400'}>
                          {hasName ? '✓' : '○'} Name: {hasName ? profile.name : 'pending'}
                        </span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span className={hasAge ? 'text-green-600' : 'text-gray-400'}>
                          {hasAge ? '✓' : '○'} Age: {hasAge ? profile.age : 'pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-purple-600">Lifestyle Areas:</span>
                        <span className={completedCategories.length >= 6 ? 'text-green-600 font-medium' : 'text-purple-600'}>
                          {completedCategories.length}/7
                        </span>
                      </div>
                      {completedCategories.length >= 6 && (
                        <div className="text-xs text-green-600 font-medium">
                          🎉 Ready for financial analysis!
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            
            {/* Report Status */}
            {isInSummary && (
              <div className="w-full max-w-sm bg-blue-50/80 backdrop-blur-sm p-4 rounded-xl border border-blue-200/50 shadow-sm">
                <p className="text-xs text-blue-600 mb-2 font-medium uppercase tracking-wider">Session Status</p>
                <p className="text-sm text-blue-700 leading-relaxed">
                  📊 Financial analysis complete! Ask questions about your report or end the session to download.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Display */}
      {showReport && report && (
        <div className="flex-1 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
              <h3 className="text-xl font-bold mb-2">Your Financial Analysis</h3>
              <p className="text-blue-100 text-sm">
                Generated by {therapist.name} • {new Date('generatedAt' in report ? report.generatedAt : Date.now()).toLocaleDateString()}
              </p>
            </div>
            
            <div className="p-6">
              {/* Quantitative Section */}
              {report.quantitative && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">📊 Spending Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(report.quantitative).map(([key, value]: [string, any]) => {
                      if (key === 'savings') {
                        return (
                          <div key={key} className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-800 capitalize">Savings Rate</p>
                            <p className="text-xl font-bold text-green-600">{value}%</p>
                          </div>
                        );
                      }
                      
                      if (value && typeof value === 'object' && value.percentage) {
                        return (
                          <div key={key} className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                            <p className="text-lg font-semibold text-gray-800">{value.percentage}%</p>
                            {value.amount && <p className="text-xs text-gray-500">${value.amount}</p>}
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Qualitative Section */}
              {report.qualitative && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800">💡 Key Insights</h4>
                  
                  {report.qualitative.strengthsSummary && (
                    <div className="mb-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <h5 className="font-medium text-green-800 mb-2">✅ Strengths</h5>
                      <p className="text-sm text-green-700">{report.qualitative.strengthsSummary}</p>
                    </div>
                  )}
                  
                  {report.qualitative.opportunitiesSummary && (
                    <div className="mb-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                      <h5 className="font-medium text-orange-800 mb-2">🎯 Opportunities</h5>
                      <p className="text-sm text-orange-700">{report.qualitative.opportunitiesSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3">
              <button 
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
              
              {conversation.status === 'connected' && (
                <button 
                  onClick={endConversation}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Session
                </button>
              )}
            </div>
          </div>
          
          {/* Q&A Prompts */}
          {conversation.status === 'connected' && isInSummary && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-2">Questions you might ask:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• &ldquo;Why is my housing cost considered high?&rdquo;</li>
                    <li>• &ldquo;How can I improve my savings rate?&rdquo;</li>
                    <li>• &ldquo;What should I prioritize first?&rdquo;</li>
                    <li>• &ldquo;Can you explain my spending categories?&rdquo;</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}