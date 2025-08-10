'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Settings, MessageSquare, Phone, ChevronDown, ChevronUp, MessageCircle, Menu, X, TestTube, Mic, Volume2 } from 'lucide-react';
import { ConversationMessage, TherapistNote, ConversationTopic, VoiceControlSettings } from '@/lib/types';
import { getTherapist } from '@/lib/therapist-loader';
import { useNotebook } from '@/hooks/useNotebook';
import { getLifestyleProgress } from '@/lib/progress-utils';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import VoiceInput from './VoiceInput';
import SessionNotes from './SessionNotes';
import NotebookReport from './NotebookReport';
import VoiceSettings from './VoiceSettings';
import ConversationalAI from './ConversationalAI';
import VoiceConversation from './VoiceConversation';
import ConversationMode from './ConversationMode';
import VoiceControls from './VoiceControls';

interface ChatInterfaceV2Props {
  selectedTherapistId: string;
}

export default function ChatInterfaceV2({ selectedTherapistId }: ChatInterfaceV2Props) {
  // Use the new notebook system
  const {
    notebook,
    isLoading: isNotebookLoading,
    isGeneratingReports,
    hasReports,
    error: notebookError,
    addMessage: addNotebookMessage,
    addNote: addNotebookNote,
    updateTopic: updateNotebookTopic,
    updateProfile: updateNotebookProfile,
    generateReports,
    getMessages,
    getNotes,
    getCurrentTopic,
    getUserProfile
  } = useNotebook(selectedTherapistId);

  // UI state (keeping existing UI structure)
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
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
  const [showVoiceControls, setShowVoiceControls] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true); // Always show transcript by default
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [financialReport, setFinancialReport] = useState<any>(null);
  const [showDropdownMenu, setShowDropdownMenu] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [testVoiceStatus, setTestVoiceStatus] = useState<'idle' | 'speaking' | 'listening' | 'processing'>('idle');
  const [testTranscript, setTestTranscript] = useState<string>('');
  const [voiceMode, setVoiceMode] = useState<'manual' | 'conversation'>('conversation');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get data from notebook
  const messages = getMessages();
  const notes = getNotes();
  const currentTopic = getCurrentTopic();
  const userProfile = getUserProfile();
  
  // Debug logging for message updates
  useEffect(() => {
    console.log('📝 ChatInterfaceV2 messages updated:', {
      messageCount: messages.length,
      lastMessage: messages[messages.length - 1]?.text?.substring(0, 50) + '...',
      showTranscript: showTranscript
    });
  }, [messages, showTranscript]);

  // Initialize session when therapist changes
  useEffect(() => {
    console.log('🎯 ChatInterface V2 received selectedTherapistId:', selectedTherapistId);
    
    // Add initial message if we have a new notebook
    if (notebook && messages.length === 0) {
      const therapist = getTherapist(selectedTherapistId);
      if (therapist) {
        // Generate initial message
        const initialMessage: ConversationMessage = {
          id: '1',
          speaker: 'therapist',
          text: `Hi! I'm ${therapist.name}. ${therapist.tagline}. I'm here to help you understand your financial lifestyle and goals. To get started, could you please tell me your name?`,
          timestamp: new Date()
        };
        addNotebookMessage(initialMessage);
      }
    }
  }, [selectedTherapistId, notebook, messages.length]);

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
    // Prevent duplicate messages - check if same text was added recently (within 10 seconds)
    if (messages && messages.length > 0) {
      const recentMessages = messages.filter(msg => {
        const msgTime = new Date(msg.timestamp);
        const now = new Date();
        return (now.getTime() - msgTime.getTime()) < 10000; // Within 10 seconds
      });
      
      // Check for exact text match in recent messages
      const isDuplicate = recentMessages.some(msg => 
        msg.text === text && msg.speaker === speaker
      );
      
      if (isDuplicate) {
        console.log('🚫 Preventing duplicate message:', { speaker, text: text.substring(0, 50) + '...' });
        return;
      }
    }

    const newMessage: ConversationMessage = {
      id: Date.now().toString(),
      speaker,
      text,
      timestamp: new Date()
    };
    
    console.log('✅ Adding message to notebook:', { speaker, text: text.substring(0, 50) + '...' });
    
    // Add to notebook system
    addNotebookMessage(newMessage);
    
    // Increment unread messages if transcript is collapsed
    if (!showTranscript) {
      setUnreadMessages(prev => prev + 1);
    }
  };

  const addNote = (noteText: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const note: TherapistNote = { 
      time: timestamp, 
      note: noteText, 
      topic: currentTopic 
    };
    
    // Add to notebook system
    addNotebookNote(note);
  };

  const handleUserInput = async (input: string, isVoiceInput: boolean = false) => {
    if (!input.trim()) return;

    const finalInput = input;
    
    // Add user message
    addMessage('user', finalInput);

    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Use the existing voice response API but with notebook context
      const therapist = getTherapist(selectedTherapistId);
      const progress = getLifestyleProgress(userProfile);
      const conversationContext = JSON.stringify({
        userProfile,
        currentTopic,
        messageCount: messages.length,
        notebookId: notebook?.getId(),
        progress
      });

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
        
        // Add therapist response
        addMessage('therapist', result.response);
        
        // Update topic if changed
        if (result.nextTopic && result.nextTopic !== currentTopic) {
          updateNotebookTopic(result.nextTopic as ConversationTopic);
        }
        
        // Add note if provided
        if (result.note) {
          addNote(result.note);
        }

        // Update profile with any new information
        if (result.profileUpdate) {
          updateNotebookProfile(result.profileUpdate);
        }

        // Clear input and stop typing
        setInputText('');
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error processing input:', error);
      addMessage('therapist', "I'm sorry, I'm having trouble responding right now. Could you please try again?");
      setEngineError('Response generation failed');
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!notebook) return;

    try {
      const reports = await generateReports();
      if (reports) {
        setFinancialReport(reports);
        console.log('✅ Reports generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate reports:', error);
      setEngineError('Failed to generate reports');
    }
  };


  // Rest of the component stays the same as original ChatInterface
  // This maintains the existing UI structure while using the notebook system

  if (isNotebookLoading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (notebookError || engineError) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <p className="font-medium">Session Error</p>
          <p className="text-sm mt-2">{notebookError || engineError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const therapist = getTherapist(selectedTherapistId);
  if (!therapist) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-red-600">
          <p>Therapist not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 bg-gradient-to-r ${therapist.color ? `from-${therapist.color}-50 to-${therapist.color}-100` : 'from-blue-50 to-purple-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{therapist.icon}</div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{therapist.name}</h2>
              <p className="text-sm text-gray-600">{therapist.tagline}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Voice Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVoiceMode('conversation')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  voiceMode === 'conversation' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Natural conversation mode"
              >
                <Mic size={12} className="inline mr-1" />
                Natural
              </button>
              <button
                onClick={() => setVoiceMode('manual')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  voiceMode === 'manual' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                title="Push-to-talk mode"
              >
                <Phone size={12} className="inline mr-1" />
                Push-to-talk
              </button>
            </div>

            {/* Notebook status indicator */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${notebook?.hasChanges() ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
              <span>{notebook?.hasChanges() ? 'Unsaved' : 'Saved'}</span>
              {hasReports && <span className="text-blue-600">• Reports Ready</span>}
            </div>

            {/* Generate Reports Button */}
            <button
              onClick={handleGenerateReport}
              disabled={isGeneratingReports || messages.length < 4}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingReports ? 'Generating...' : 'Generate Reports'}
            </button>

            {/* Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdownMenu(!showDropdownMenu)}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full"
              >
                <Menu size={16} />
              </button>
              
              {showDropdownMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowTranscript(!showTranscript);
                        setShowDropdownMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <MessageCircle size={14} />
                      <span>
                        {showTranscript ? 'Hide' : 'Show'} Transcript
                        {unreadMessages > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                            {unreadMessages}
                          </span>
                        )}
                      </span>
                    </button>
                    
                    {hasReports && (
                      <button
                        onClick={() => {
                          setShowSummary(!showSummary);
                          setShowDropdownMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Settings size={14} />
                        <span>{showSummary ? 'Hide' : 'Show'} Reports</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-96">
        {/* Left Side - Therapist and Transcript */}
        <div className="flex-1 flex flex-col">
          {/* Voice Conversation Component */}
          <div className="flex-1 p-4">
            {voiceMode === 'conversation' ? (
              <ConversationMode
                therapistId={selectedTherapistId}
                therapist={therapist}
                onMessage={(message, speaker) => {
                  // Map ConversationMode speaker types to addMessage types
                  const mappedSpeaker = speaker === 'agent' ? 'therapist' : speaker;
                  addMessage(mappedSpeaker, message);
                }}
                onNoteGenerated={(note) => {
                  addNote(note);
                }}
                onProfileUpdate={(profileData) => {
                  updateNotebookProfile(profileData);
                }}
                onReportGenerated={(report) => {
                  setFinancialReport(report);
                }}
              />
            ) : (
              <VoiceConversation
                onVoiceInput={handleUserInput}
                isProcessing={isTyping}
                isPlayingTTS={isPlayingTTS}
                onInterruptTTS={() => {
                  if (currentTTSAudio) {
                    currentTTSAudio.pause();
                    currentTTSAudio.currentTime = 0;
                    setIsPlayingTTS(false);
                  }
                }}
                onStartSession={() => setVoiceSessionStarted(true)}
                hasStarted={voiceSessionStarted}
                therapistName={therapist.name}
                therapist={therapist}
                sttProvider={voiceControlSettings.sttProvider}
                isTranscoding={isTranscoding}
              />
            )}
          </div>

          {/* Live Transcript - Below therapist panel */}
          <div className={`border-t border-gray-200 flex flex-col ${showTranscript ? 'max-h-64' : 'h-auto'}`}>
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-medium text-gray-800">Live Transcript</h3>
              <div className="flex items-center space-x-2">
                {unreadMessages > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unreadMessages}
                  </span>
                )}
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {showTranscript ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>
            </div>
            
            {/* Transcript content - Collapsible */}
            {showTranscript && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isTyping && <TypingIndicator />}
                  <div ref={chatEndRef} />
                </div>

                {/* Text Input for Transcript */}
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (inputText.trim()) {
                            handleUserInput(inputText.trim(), false);
                          }
                        }
                      }}
                      placeholder="Type your response..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={isTyping}
                    />
                    <button
                      onClick={() => {
                        if (inputText.trim()) {
                          handleUserInput(inputText.trim(), false);
                        }
                      }}
                      disabled={isTyping || !inputText.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Notebook */}
        <div className="w-80 border-l border-gray-200 flex flex-col">
          {/* Session Notebook Panel - Top aligned with therapist panel */}
          <div className="flex-1">
            <SessionNotes 
              notes={notes} 
              therapist={therapist} 
              userProfile={userProfile} 
            />
          </div>

          {/* Reports Panel - Show when available */}
          {showSummary && financialReport && (
            <div className="border-t border-gray-200 flex flex-col max-h-48">
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-medium text-gray-800">Financial Report</h3>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3">
                <NotebookReport 
                  qualitative={financialReport.qualitative}
                  quantitative={financialReport.quantitative}
                  notebookId={notebook?.getId() || ''}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}