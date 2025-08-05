'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Loader2, AlertCircle, Volume2, VolumeX } from 'lucide-react';

interface VoiceConversationProps {
  onVoiceInput: (transcript: string) => void;
  isProcessing: boolean;
  isPlayingTTS: boolean;
  onInterruptTTS: () => void;
  enableTextCleanup: boolean;
  onStartSession: () => void;
  hasStarted: boolean;
  therapistName: string;
}

export default function VoiceConversation({ 
  onVoiceInput, 
  isProcessing, 
  isPlayingTTS,
  onInterruptTTS,
  enableTextCleanup,
  onStartSession,
  hasStarted,
  therapistName
}: VoiceConversationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isCleaningText, setIsCleaningText] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      // If TTS is playing, interrupt it
      if (isPlayingTTS) {
        onInterruptTTS();
      }

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setHasPermission(false);
      setError('Microphone access denied. Please enable microphone permissions.');
    }
  }, [isPlayingTTS, onInterruptTTS]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);

    // Process the transcript if we have one
    if (transcript.trim()) {
      let finalTranscript = transcript.trim();
      
      // Clean up the text if enabled
      if (enableTextCleanup) {
        finalTranscript = await cleanupText(finalTranscript);
      }

      // Send to parent component
      onVoiceInput(finalTranscript);
      setTranscript('');
    }
  }, [transcript, enableTextCleanup, onVoiceInput, cleanupText]);

  const handleButtonPress = useCallback(() => {
    if (!hasStarted) {
      // Start the session - this will trigger Danielle's initial greeting
      onStartSession();
    } else if (isRecording) {
      stopRecording();
    } else if (isPlayingTTS) {
      // If TTS is playing, interrupt it and start recording
      onInterruptTTS();
      setTimeout(() => startRecording(), 100); // Small delay to ensure TTS stops
    } else {
      startRecording();
    }
  }, [hasStarted, isRecording, isPlayingTTS, startRecording, stopRecording, onInterruptTTS, onStartSession]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
      {/* Status Message */}
      <div className="text-center max-w-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Voice Conversation with {therapistName}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Click to start speaking, click again to stop and send
        </p>
        {hasPermission === false && (
          <p className="text-xs text-orange-600 mb-2">
            🎤 Microphone access required
          </p>
        )}
      </div>

      {/* Main Voice Button */}
      <div className="relative">
        <button
          onClick={handleButtonPress}
          disabled={isProcessing || isCleaningText}
          className={`relative flex items-center justify-center w-20 h-20 rounded-full font-medium transition-all transform hover:scale-105 ${
            !hasStarted
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : isPlayingTTS
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
          } ${(isProcessing || isCleaningText) ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {!hasStarted ? (
            <Volume2 className="w-8 h-8" />
          ) : isRecording ? (
            <Square className="w-8 h-8" />
          ) : isPlayingTTS ? (
            <VolumeX className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        {isProcessing ? (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
{therapistName} is thinking...
          </div>
        ) : isCleaningText ? (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cleaning up your speech...
          </div>
        ) : !hasStarted ? (
          <p className="text-sm text-blue-600 font-medium">
            🎯 Click to start session with {therapistName}
          </p>
        ) : isRecording ? (
          <p className="text-sm text-red-600 font-medium">
            🎤 Recording... Click again to stop and send
          </p>
        ) : isPlayingTTS ? (
          <p className="text-sm text-yellow-600 font-medium">
            🔊 {therapistName} is speaking... Press to interrupt
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Press to start speaking
          </p>
        )}
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div className="bg-white p-3 rounded-lg border max-w-sm">
          <p className="text-xs text-gray-500 mb-1">Live transcript:</p>
          <p className="text-sm text-gray-800">{transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 max-w-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        {!hasStarted
          ? `Click to begin your voice conversation with ${therapistName}. They'll greet you and start the session.`
          : isRecording 
            ? "Speak clearly, then click the button again to stop and send your message"
            : isPlayingTTS
              ? `${therapistName} is responding. Click the button to interrupt and speak.`
              : `Your voice will be processed through ${therapistName}'s conversation engine`
        }
      </div>
    </div>
  );
}