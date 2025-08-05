'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Wand2, Settings } from 'lucide-react';
import { ConversationMessage, TherapistNote, ConversationTopic } from '@/lib/types';
import { getTherapist } from '@/lib/therapist-loader';
import { ConversationEngine } from '@/lib/conversation-engine';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import VoiceInput from './VoiceInput';
import SessionNotes from './SessionNotes';
import FinancialSummary from './FinancialSummary';

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
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize conversation engine when therapist changes
  useEffect(() => {
    try {
      const therapist = getTherapist(selectedTherapistId);
      const engine = new ConversationEngine(therapist);
      setConversationEngine(engine);
      
      // Reset conversation state
      setMessages([]);
      setNotes([]);
      setCurrentTopic('intro');
      setShowSummary(false);
      
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
    }
  }, [selectedTherapistId]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
      
      // Simulate typing delay for better UX
      setTimeout(() => {
        addMessage('therapist', response);
        setCurrentTopic(nextTopic);
        setIsTyping(false);
        
        // Check if we should show summary
        if (nextTopic === 'summary' && finalInput.toLowerCase().includes('yes')) {
          setTimeout(() => setShowSummary(true), 1000);
        }
      }, 1500);
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

  const getUserProfile = () => {
    return conversationEngine?.getUserProfile() || null;
  };

  if (!conversationEngine) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
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

          {/* Chat Messages */}
          <div className="h-80 overflow-y-auto mb-6 p-4 bg-gray-50 rounded-lg">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} therapistId={selectedTherapistId} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            {/* Voice Cleanup Toggle */}
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
        </div>
      </div>

      {/* Session Notes Panel */}
      <SessionNotes notes={notes} therapist={therapist} userProfile={userProfile} />
    </div>
  );
}