'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Wand2, Settings, MessageSquare, Phone } from 'lucide-react';
import { ConversationMessage, TherapistNote, ConversationTopic } from '@/lib/types';
import { getTherapist } from '@/lib/therapist-loader';
import { ConversationEngine } from '@/lib/conversation-engine';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import VoiceInput from './VoiceInput';
import SessionNotes from './SessionNotes';
import FinancialSummary from './FinancialSummary';
import VoiceSettings from './VoiceSettings';
import ConversationalAI from './ConversationalAI';
import VoiceConversation from './VoiceConversation';

interface ChatInterfaceProps {
  selectedTherapistId: string;
}

export default function ChatInterface({ selectedTherapistId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [notes, setNotes] = useState<TherapistNote[]>([]);
  const [currentTopic, setCurrentTopic] = useState<ConversationTopic>('intro');
  const [showSummary, setShowSummary] = useState(false);
  const [conversationEngine, setConversationEngine] = useState<ConversationEngine | null>(null);
  const [enableTextCleanup, setEnableTextCleanup] = useState(true);
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
  const [conversationMode, setConversationMode] = useState<'text' | 'voice'>('text');
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [currentTTSAudio, setCurrentTTSAudio] = useState<HTMLAudioElement | null>(null);
  const [voiceSessionStarted, setVoiceSessionStarted] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation engine when therapist changes
  useEffect(() => {
    try {
      setEngineError(null);
      setConversationEngine(null); // Reset first
      
      const therapist = getTherapist(selectedTherapistId);
      const engine = new ConversationEngine(therapist);
      setConversationEngine(engine);
      
      // Reset conversation state
      setMessages([]);
      setNotes([]);
      setCurrentTopic('intro');
      setShowSummary(false);
      setVoiceSessionStarted(false);
      
      // Add initial message
      const initialMessage: ConversationMessage = {
        id: '1',
        speaker: 'therapist',
        text: engine.getInitialMessage(),
        timestamp: new Date()
      };
      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error loading therapist:', error);
      setEngineError(error instanceof Error ? error.message : 'Failed to load therapist');
      setConversationEngine(null);
    }
  }, [selectedTherapistId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Cleanup TTS audio on unmount
  useEffect(() => {
    return () => {
      if (currentTTSAudio) {
        currentTTSAudio.pause();
        currentTTSAudio.currentTime = 0;
      }
    };
  }, [currentTTSAudio]);

  const addMessage = (speaker: 'user' | 'therapist', text: string) => {
    const newMessage: ConversationMessage = {
      id: Date.now().toString(),
      speaker,
      text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addNote = (note: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotes(prev => [...prev, { time: timestamp, note, topic: currentTopic }]);
  };

  const cleanupText = async (rawText: string): Promise<string> => {
    if (!enableTextCleanup) {
      return rawText;
    }

    try {
      setIsCleaningText(true);
      const response = await fetch('/api/cleanup-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: rawText }),
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup text');
      }

      const { cleanedText } = await response.json();
      return cleanedText || rawText;
    } catch (error) {
      console.error('Error cleaning up text:', error);
      return rawText; // Fallback to original text
    } finally {
      setIsCleaningText(false);
    }
  };

  const handleUserInput = async (input: string, isVoiceInput: boolean = false) => {
    if (!input.trim() || !conversationEngine) return;

    let finalInput = input;
    
    // If this is voice input, clean it up first
    if (isVoiceInput && enableTextCleanup) {
      finalInput = await cleanupText(input);
    }

    // Add user message (showing the cleaned up version)
    addMessage('user', finalInput);

    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Process with conversation engine (now async)
      const { response, nextTopic, note } = await conversationEngine.processUserInput(finalInput);
      
      // Add note
      addNote(note);
      
      // In voice mode, play TTS first then show text after delay
      if (conversationMode === 'voice') {
        setTimeout(async () => {
          setIsTyping(false);
          setCurrentTopic(nextTopic);
          
          // Play TTS immediately, text will be added when audio starts
          await playTTSForMessage(response, true);
          
          // Check if we should show summary
          if (nextTopic === 'summary' && finalInput.toLowerCase().includes('yes')) {
            setTimeout(() => setShowSummary(true), 1000);
          }
        }, 1000);
      } else {
        // Text mode - show message immediately with typing delay
        setTimeout(() => {
          addMessage('therapist', response);
          setCurrentTopic(nextTopic);
          setIsTyping(false);
          
          // Check if we should show summary
          if (nextTopic === 'summary' && finalInput.toLowerCase().includes('yes')) {
            setTimeout(() => setShowSummary(true), 1000);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error processing user input:', error);
      setIsTyping(false);
      addMessage('therapist', "I'm sorry, I had trouble processing that. Could you try again?");
      addNote("Error processing user input");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleUserInput(inputText, false);
      setInputText('');
    }
  };

  const handleVoiceInput = (transcript: string) => {
    handleUserInput(transcript, true);
  };

  const interruptTTS = () => {
    if (currentTTSAudio) {
      currentTTSAudio.pause();
      currentTTSAudio.currentTime = 0;
      setCurrentTTSAudio(null);
      setIsPlayingTTS(false);
    }
  };

  const playTTSForMessage = async (text: string, addToChat: boolean = false) => {
    // Only auto-play TTS in voice mode, unless explicitly requested (addToChat = true)
    if (conversationMode !== 'voice' && !addToChat) return;

    try {
      setIsPlayingTTS(true);
      
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          therapistId: selectedTherapistId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      setCurrentTTSAudio(audio);

      audio.onended = () => {
        setIsPlayingTTS(false);
        setCurrentTTSAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingTTS(false);
        setCurrentTTSAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      // Add to chat when audio starts playing if requested
      audio.onplay = () => {
        if (addToChat) {
          addMessage('therapist', text);
        }
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing TTS:', error);
      setIsPlayingTTS(false);
      setCurrentTTSAudio(null);
    }
  };

  const startVoiceSession = async () => {
    if (!conversationEngine) return;
    
    try {
      setVoiceSessionStarted(true);
      setConversationMode('voice'); // Ensure we're in voice mode
      
      // Get initial greeting
      const initialMessage = conversationEngine.getInitialMessage();
      
      // Play TTS and add to chat when audio starts playing
      await playTTSForMessage(initialMessage, true);
    } catch (error) {
      console.error('Error starting voice session:', error);
    }
  };

  const getUserProfile = () => {
    return conversationEngine?.getUserProfile() || null;
  };

  if (!conversationEngine) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center">
        {engineError ? (
          <>
            <div className="text-lg text-red-600 mb-2">Error Loading Therapist</div>
            <div className="text-sm text-red-500 mb-4">
              {engineError}
            </div>
            <div className="text-xs text-gray-500">
              Trying to load: {selectedTherapistId}
            </div>
          </>
        ) : (
          <>
            <div className="text-lg text-gray-600 mb-2">Loading...</div>
            <div className="text-sm text-gray-500">
              Setting up conversation with {selectedTherapistId}
            </div>
          </>
        )}
      </div>
    );
  }

  const therapist = getTherapist(selectedTherapistId);
  const userProfile = getUserProfile();

  if (showSummary && userProfile) {
    return (
      <div className="flex gap-6">
        <div className="flex-1 max-w-md">
          <FinancialSummary 
            userProfile={userProfile}
            therapist={therapist}
            onStartNew={() => {
              setShowSummary(false);
              conversationEngine.reset();
              setMessages([{
                id: Date.now().toString(),
                speaker: 'therapist',
                text: conversationEngine.getInitialMessage(),
                timestamp: new Date()
              }]);
              setNotes([]);
              setCurrentTopic('intro');
            }}
          />
        </div>
        <SessionNotes notes={notes} therapist={therapist} userProfile={userProfile} />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Conversation Mode Toggle */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setConversationMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  conversationMode === 'text' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Text Chat
              </button>
              <button
                onClick={() => {
                  setConversationMode('voice');
                  setVoiceSessionStarted(false); // Reset when switching to voice mode
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  conversationMode === 'voice' 
                    ? 'bg-white text-green-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                Voice Call
              </button>
            </div>
          </div>

          {/* User Profile Info */}
          {userProfile && (userProfile.name || userProfile.age || userProfile.location) && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{userProfile.name || 'Guest'}</span>
                {userProfile.age && <span>• {userProfile.age} years old</span>}
                {userProfile.location && <span>• {userProfile.location}</span>}
              </div>
            </div>
          )}

          {/* Start Voice Conversation Button */}
          {conversationMode === 'text' && !voiceSessionStarted && (
            <div className="mb-6 text-center">
              <button
                onClick={() => {
                  setConversationMode('voice');
                  startVoiceSession();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <Phone className="w-5 h-5" />
                Start Voice Conversation
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Click to begin talking with {getTherapist(selectedTherapistId).name}
              </p>
            </div>
          )}

          {/* Chat Messages or Voice Call Interface */}
          {conversationMode === 'text' ? (
            <div className="h-80 overflow-y-auto mb-6 p-4 bg-gray-50 rounded-lg">
              {messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  therapistId={selectedTherapistId}
                  useElevenLabs={useElevenLabs}
                />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          ) : (
            <div className="h-80 mb-6 flex items-center justify-center">
              <VoiceConversation 
                onVoiceInput={handleVoiceInput}
                isProcessing={isTyping}
                isPlayingTTS={isPlayingTTS}
                onInterruptTTS={interruptTTS}
                enableTextCleanup={enableTextCleanup}
                onStartSession={startVoiceSession}
                hasStarted={voiceSessionStarted}
                therapistName={getTherapist(selectedTherapistId).name}
              />
            </div>
          )}

          {/* Input Area - Only show in text mode */}
          {conversationMode === 'text' && (
            <div className="space-y-3">
            {/* Voice Cleanup Toggle and Voice Settings */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnableTextCleanup(!enableTextCleanup)}
                  className={`flex items-center gap-2 px-3 py-1 text-xs rounded-full transition-colors ${
                    enableTextCleanup 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Toggle voice input cleanup"
                >
                  <Wand2 className="w-3 h-3" />
                  Voice Cleanup: {enableTextCleanup ? 'On' : 'Off'}
                </button>
                
                <VoiceSettings
                  useElevenLabs={useElevenLabs}
                  onToggleElevenLabs={setUseElevenLabs}
                />
                {isCleaningText && (
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Cleaning up speech with AI...
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  🤖 AI-Powered Conversations
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <VoiceInput 
                onTranscript={handleVoiceInput}
                isDisabled={isTyping || isCleaningText}
              />
              
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your response or use voice input..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isTyping || isCleaningText}
              />
              
              <button
                type="submit"
                disabled={isTyping || isCleaningText || !inputText.trim()}
                className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                You can type or click the microphone to speak
                {enableTextCleanup && (
                  <span className="text-green-600"> • Voice cleanup enabled</span>
                )}
              </p>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Session Notes Panel */}
      <SessionNotes notes={notes} therapist={therapist} userProfile={userProfile} />
    </div>
  );
}