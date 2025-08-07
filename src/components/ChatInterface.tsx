'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Settings, MessageSquare, Phone, ChevronDown, ChevronUp, MessageCircle, Menu, X, TestTube, Mic, Volume2 } from 'lucide-react';
import { ConversationMessage, TherapistNote, ConversationTopic, VoiceControlSettings } from '@/lib/types';
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
import VoiceControls from './VoiceControls';

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
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
  // Always use voice mode now
  const conversationMode = 'voice';
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [currentTTSAudio, setCurrentTTSAudio] = useState<HTMLAudioElement | null>(null);
  const [voiceSessionStarted, setVoiceSessionStarted] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [voiceControlSettings, setVoiceControlSettings] = useState<VoiceControlSettings>({
    responseLength: 3,
    speakingPace: 3,
    engagement: 3,
    style: 3,
    sttProvider: 'elevenlabs'
  });
  const [showVoiceControls, setShowVoiceControls] = useState(false); // Start collapsed to avoid interference
  const [showTranscript, setShowTranscript] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [financialReport, setFinancialReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [testVoiceStatus, setTestVoiceStatus] = useState<'idle' | 'speaking' | 'listening' | 'processing'>('idle');
  const [testTranscript, setTestTranscript] = useState<string>('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
      engine.getInitialMessage().then((text) => {
        const initialMessage: ConversationMessage = {
          id: '1',
          speaker: 'therapist',
          text: text,
          timestamp: new Date()
        };
        setMessages([initialMessage]);
      });
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
  
  // Clear unread messages when transcript is open
  useEffect(() => {
    if (showTranscript) {
      setUnreadMessages(0);
    }
  }, [showTranscript, messages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdownMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    
    // Increment unread messages if transcript is collapsed
    if (!showTranscript) {
      setUnreadMessages(prev => prev + 1);
    }
  };

  const addNote = (note: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotes(prev => [...prev, { time: timestamp, note, topic: currentTopic }]);
  };


  const handleUserInput = async (input: string, isVoiceInput: boolean = false) => {
    if (!input.trim() || !conversationEngine) return;

    const finalInput = input;
    
    // Skip text cleanup - use raw input directly
    // Add user message
    addMessage('user', finalInput);

    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Always use voice-aware API for enhanced responses
      let response, nextTopic, note;
      
      // Use enhanced voice response API
      const conversationContext = conversationEngine?.buildConversationContext() || '';
      const apiResponse = await fetch('/api/therapist-voice-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId: selectedTherapistId,
          userInput: finalInput,
          conversationContext,
          currentTopic,
          voiceSettings: voiceControlSettings
        })
      });
      
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        response = result.response;
        nextTopic = result.nextTopic;
        // Generate a more contextual note using user's name
        const userName = conversationEngine?.getUserProfile()?.name || 'Client';
        note = `${userName} ${currentTopic === 'interests' ? 'shares interests and values' : 
                              currentTopic === 'housing_location' ? 'discusses location and living situation' :
                              currentTopic === 'housing_preference' ? 'explains housing preferences' :
                              currentTopic === 'food_preference' ? 'describes food habits' :
                              currentTopic === 'transport_preference' ? 'talks about transportation' :
                              currentTopic === 'fitness_preference' ? 'shares fitness routine' :
                              currentTopic === 'entertainment_preference' ? 'discusses entertainment choices' :
                              currentTopic === 'subscriptions_preference' ? 'reviews subscriptions' :
                              currentTopic === 'travel_preference' ? 'describes travel preferences' :
                              `discusses ${currentTopic}`}. Enhanced voice response.`;
      } else {
        // API failed - log the failure and show error to user
        const errorData = await apiResponse.json();
        console.error('[CHAT_API_FAILURE]', new Date().toISOString(), errorData);
        
        // Log to failure tracking endpoint
        await fetch('/api/log-failure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            failureType: errorData.failureType || 'UNKNOWN',
            therapistId: selectedTherapistId,
            currentTopic,
            errorMessage: errorData.errorMessage || 'API request failed'
          })
        });
        
        // Show error message to user
        response = "I apologize, but I'm having trouble connecting right now. Please try again in a moment.";
        nextTopic = currentTopic; // Stay on same topic
        note = `API Failure: ${errorData.failureType || 'Unknown error'}`;
      }
      
      // Add note
      addNote(note);
      
      // Always use voice mode flow
      setTimeout(async () => {
        setIsTyping(false);
        setCurrentTopic(nextTopic);
        
        // Play TTS immediately, text will be added when audio starts
        await playTTSForMessage(response, true);
        
        // Check if we should show summary
        if (nextTopic === 'summary' && finalInput.toLowerCase().includes('yes')) {
          setTimeout(() => setShowSummary(true), 1000);
        }

        // Check if we should generate financial report
        const updatedProfile = conversationEngine.getUserProfile();
        if (updatedProfile) {
          setTimeout(() => checkAndGenerateReport(updatedProfile), 2000);
        }
      }, 1000);
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
    try {
      setIsTranscoding(true);
      setIsPlayingTTS(true);
      
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          therapistId: selectedTherapistId,
          speakingPace: voiceControlSettings.speakingPace,
        }),
      });

      if (!response.ok) {
        // If ElevenLabs fails, fall back to browser TTS
        console.warn('ElevenLabs TTS failed, falling back to browser TTS');
        
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = voiceControlSettings.speakingPace / 3; // Convert 1-5 scale to 0.3-1.7
          
          utterance.onend = () => {
            setIsPlayingTTS(false);
            setIsTranscoding(false);
          };
          
          utterance.onerror = () => {
            setIsPlayingTTS(false);
            setIsTranscoding(false);
          };
          
          // Add message to chat
          if (addToChat) {
            addMessage('therapist', text);
          }
          
          setIsTranscoding(false);
          window.speechSynthesis.speak(utterance);
          return;
        } else {
          throw new Error('No TTS available');
        }
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      setCurrentTTSAudio(audio);
      setIsTranscoding(false); // Transcoding complete, now ready to play

      audio.onended = () => {
        setIsPlayingTTS(false);
        setCurrentTTSAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingTTS(false);
        setCurrentTTSAudio(null);
        setIsTranscoding(false);
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
      setIsTranscoding(false);
      
      // Still add the message to chat even if TTS fails
      if (addToChat) {
        addMessage('therapist', text);
      }
    }
  };

  const startVoiceSession = async () => {
    if (!conversationEngine) return;
    
    try {
      setVoiceSessionStarted(true);
      
      // Get initial greeting
      const initialMessage = await conversationEngine.getInitialMessage();
      
      // Play TTS and add to chat when audio starts playing
      await playTTSForMessage(initialMessage, true);
    } catch (error) {
      console.error('Error starting voice session:', error);
    }
  };

  const getUserProfile = () => {
    return conversationEngine?.getUserProfile() || null;
  };

  const checkAndGenerateReport = async (profile: any) => {
    if (!profile || isGeneratingReport || financialReport) return;

    // Check if all required lifestyle data is collected
    const lifestyle = profile.lifestyle;
    const requiredFields = ['housing', 'food', 'transport', 'fitness', 'entertainment', 'subscriptions', 'travel'];
    const completedFields = requiredFields.filter(field => 
      lifestyle[field] && lifestyle[field].preference && lifestyle[field].preference.trim() !== ''
    );

    // Generate report when we have at least 6 out of 7 categories (allowing for some flexibility)
    if (completedFields.length >= 6 && profile.name && profile.age) {
      setIsGeneratingReport(true);
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
          const report = await response.json();
          setFinancialReport(report);
        } else {
          console.error('Failed to generate financial report');
        }
      } catch (error) {
        console.error('Error generating financial report:', error);
      } finally {
        setIsGeneratingReport(false);
      }
    }
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

  // Voice test functionality
  const handleVoiceTest = async () => {
    if (isTestingVoice) return;
    
    setIsTestingVoice(true);
    setTestVoiceStatus('speaking');
    setTestTranscript('');
    
    try {
      // Test TTS first
      const testMessage = "Hello! This is a voice test. Please say something after the beep so I can test speech recognition.";
      await playTTSForMessage(testMessage, false);
      
      // Brief pause then start listening
      setTimeout(() => {
        setTestVoiceStatus('listening');
        console.log('Voice test: Now listening for speech...');
      }, 500);
      
    } catch (error) {
      console.error('Voice test failed:', error);
      setTestVoiceStatus('idle');
      setIsTestingVoice(false);
      setTestTranscript('Voice test failed');
    }
  };

  // Handler for test voice input
  const handleTestVoiceInput = (transcript: string) => {
    if (isTestingVoice && testVoiceStatus === 'listening') {
      setTestVoiceStatus('processing');
      setTestTranscript(transcript);
      
      setTimeout(() => {
        setTestVoiceStatus('idle');
        setIsTestingVoice(false);
        // Play back what was heard
        playTTSForMessage(`I heard you say: ${transcript}`, false);
      }, 1000);
    }
  };

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
              conversationEngine.getInitialMessage().then((text) => {
                setMessages([{
                  id: Date.now().toString(),
                  speaker: 'therapist',
                  text: text,
                  timestamp: new Date()
                }]);
              });
              setNotes([]);
              setCurrentTopic('intro');
            }}
          />
        </div>
        <SessionNotes 
          notes={notes} 
          therapist={therapist} 
          userProfile={userProfile} 
          financialReport={financialReport}
          isGeneratingReport={isGeneratingReport}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 relative">

          {/* Header with Status Indicators and Dropdown Menu */}
          <div className="absolute top-4 right-4 flex items-center gap-3">
            {/* AI Status Indicator */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${engineError ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-xs text-gray-500">AI</span>
            </div>
            
            {/* Voice Status Indicator */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                testVoiceStatus === 'speaking' ? 'bg-blue-500' :
                testVoiceStatus === 'listening' ? 'bg-yellow-500' :
                testVoiceStatus === 'processing' ? 'bg-purple-500' :
                'bg-green-500'
              }`}></div>
              <span className="text-xs text-gray-500">Voice</span>
            </div>

            {/* Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Dropdown Content */}
              {showDropdownMenu && (
                <div className="absolute right-0 top-8 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* Voice Test */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Voice Test</h3>
                    <button
                      onClick={handleVoiceTest}
                      disabled={isTestingVoice}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        isTestingVoice 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <TestTube className="w-4 h-4" />
                      {isTestingVoice ? (
                        <>
                          <span>
                            {testVoiceStatus === 'speaking' && 'Speaking...'}
                            {testVoiceStatus === 'listening' && 'Listening...'}
                            {testVoiceStatus === 'processing' && 'Processing...'}
                          </span>
                          <div className="ml-auto flex items-center gap-1">
                            {testVoiceStatus === 'speaking' && <Volume2 className="w-3 h-3" />}
                            {testVoiceStatus === 'listening' && <Mic className="w-3 h-3" />}
                            {testVoiceStatus === 'processing' && <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />}
                          </div>
                        </>
                      ) : (
                        'Test Voice System'
                      )}
                    </button>
                    
                    {/* Show transcript when available */}
                    {testTranscript && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <div className="font-medium text-gray-700 mb-1">You said:</div>
                        <div className="text-gray-600 italic">"{testTranscript}"</div>
                      </div>
                    )}
                    
                    {/* Voice recording interface for test mode */}
                    {isTestingVoice && testVoiceStatus === 'listening' && (
                      <div className="mt-2">
                        <VoiceConversation 
                          onVoiceInput={handleTestVoiceInput}
                          isProcessing={false}
                          isPlayingTTS={false}
                          onInterruptTTS={() => {}}
                          onStartSession={() => {}}
                          hasStarted={true}
                          therapistName="Test"
                          therapist={getTherapist(selectedTherapistId)}
                          sttProvider={voiceControlSettings.sttProvider}
                          isTranscoding={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Voice Settings */}
                  <div className="px-4 py-2">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Voice Settings</h3>
                    <VoiceSettings
                      useElevenLabs={useElevenLabs}
                      onToggleElevenLabs={setUseElevenLabs}
                    />
                    
                    {/* Voice Controls Toggle */}
                    <button
                      onClick={() => {
                        setShowVoiceControls(!showVoiceControls);
                        setShowDropdownMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-md text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Advanced Voice Controls
                    </button>
                  </div>
                </div>
              )}
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

          {/* Voice Interface with Transcript Below */}
          <div className="space-y-4">
            {/* Voice Controls - Only show when expanded from dropdown */}
            {showVoiceControls && (
              <VoiceControls 
                settings={voiceControlSettings}
                onSettingsChange={setVoiceControlSettings}
                isExpanded={true}
                onToggle={() => setShowVoiceControls(!showVoiceControls)}
              />
            )}
            
            {/* Voice Conversation Interface */}
            <div className="flex items-center justify-center py-8">
              <VoiceConversation 
                onVoiceInput={handleVoiceInput}
                isProcessing={isTyping}
                isPlayingTTS={isPlayingTTS}
                onInterruptTTS={interruptTTS}
                onStartSession={startVoiceSession}
                hasStarted={voiceSessionStarted}
                therapistName={getTherapist(selectedTherapistId).name}
                therapist={getTherapist(selectedTherapistId)}
                sttProvider={voiceControlSettings.sttProvider}
                isTranscoding={isTranscoding}
              />
            </div>
            
            {/* Transcript Toggle Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => {
                  setShowTranscript(!showTranscript);
                  if (!showTranscript) {
                    setUnreadMessages(0); // Clear unread count when opening
                  }
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-800">Transcript</span>
                  {messages.length > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {messages.length} messages
                    </span>
                  )}
                  {unreadMessages > 0 && !showTranscript && (
                    <span className="text-xs text-white bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
                      {unreadMessages} new
                    </span>
                  )}
                </div>
                {showTranscript ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {/* Expandable Transcript Content */}
              {showTranscript && (
                <div className="border-t border-gray-200">
                  <div className="max-h-96 overflow-y-auto p-4 bg-gray-50">
                    {messages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No messages yet. Start a conversation to see the transcript.
                      </p>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  
                  {/* Text Input for Backup */}
                  <div className="border-t border-gray-200 p-3 space-y-2 bg-white">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isTyping}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isTyping}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                    
                    {/* Voice Chat Indicator */}
                    <div className="flex items-center justify-center">
                      <div className="text-xs text-gray-500">
                        🤖 AI-Powered Voice Chat
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Session Notes Panel */}
      <SessionNotes notes={notes} therapist={therapist} userProfile={userProfile} />
    </div>
  );
}