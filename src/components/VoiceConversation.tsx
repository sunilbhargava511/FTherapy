'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Loader2, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import type { TherapistPersonality } from '@/lib/types';

interface VoiceConversationProps {
  onVoiceInput: (transcript: string) => void;
  isProcessing: boolean;
  isPlayingTTS: boolean;
  onInterruptTTS: () => void;
  onStartSession: () => void;
  hasStarted: boolean;
  therapistName: string;
  therapist: TherapistPersonality;
  sttProvider: 'elevenlabs' | 'browser';
  isTranscoding?: boolean;
}

export default function VoiceConversation({ 
  onVoiceInput, 
  isProcessing, 
  isPlayingTTS,
  onInterruptTTS,
  onStartSession,
  hasStarted,
  therapistName,
  therapist,
  sttProvider,
  isTranscoding = false
}: VoiceConversationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [currentSTTMethod, setCurrentSTTMethod] = useState<'elevenlabs' | 'browser' | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'transcribing' | 'thinking' | 'transcoding'>('idle');
  
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

  const transcribeWithElevenLabs = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      console.log('Transcribing with ElevenLabs:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/elevenlabs-stt', {
        method: 'POST',
        body: formData,
      });

      console.log('ElevenLabs STT response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('ElevenLabs STT API error:', response.status, errorData);
        throw new Error(`ElevenLabs STT failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('ElevenLabs STT result:', result);
      return result.transcript || '';
    } catch (error) {
      console.error('ElevenLabs STT error:', error);
      throw error;
    }
  }, []);


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

      if (sttProvider === 'elevenlabs') {
        // Use ElevenLabs STT with MediaRecorder
        try {
          // Try different audio formats for better compatibility
          let mimeType = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/mp4';
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = ''; // Let browser choose
              }
            }
          }

          console.log('Using MediaRecorder with mimeType:', mimeType);
          
          const recorder = mimeType 
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          
          audioChunksRef.current = [];
          
          recorder.ondataavailable = (event) => {
            console.log('Audio data available:', event.data.size, 'bytes, type:', event.data.type);
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
              setAudioChunks([...audioChunksRef.current]);
            }
          };
          
          recorder.onstart = () => {
            console.log('MediaRecorder started');
          };
          
          recorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            setError('Recording failed. Please try again.');
          };
          
          // Store references
          setMediaRecorder(recorder);
          setAudioChunks([]);
          setCurrentSTTMethod('elevenlabs');
          setIsRecording(true);
          setVoiceStatus('listening');
          
          // Start recording with timeslice to collect data every 100ms
          recorder.start(100);
          console.log('Started ElevenLabs recording with format:', mimeType);
        } catch (error) {
          console.error('Failed to create MediaRecorder:', error);
          setError('Recording not supported. Using browser STT.');
          // Fallback to browser STT
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setCurrentSTTMethod('browser');
            setIsRecording(true);
          }
        }
      } else {
        // Use browser STT (fallback)
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setCurrentSTTMethod('browser');
          setIsRecording(true);
          setVoiceStatus('listening');
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setHasPermission(false);
      setError('Microphone access denied. Please enable microphone permissions.');
    }
  }, [isPlayingTTS, onInterruptTTS, sttProvider]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    setVoiceStatus('transcribing');
    
    if (currentSTTMethod === 'elevenlabs' && mediaRecorder) {
      // Handle ElevenLabs STT
      try {
        mediaRecorder.onstop = async () => {
          console.log('MediaRecorder stopped, processing chunks:', audioChunksRef.current.length);
          
          if (audioChunksRef.current.length === 0) {
            console.error('No audio data recorded');
            setError('No audio recorded. Please try again.');
            setVoiceStatus('idle');
            return;
          }
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('Created audio blob:', audioBlob.size, 'bytes');
          
          try {
            const transcript = await transcribeWithElevenLabs(audioBlob);
            
            if (transcript.trim()) {
              const finalTranscript = transcript.trim();
              
              // Skip text cleanup - send raw transcript directly
              // Send to parent component
              setVoiceStatus('idle');
              onVoiceInput(finalTranscript);
            } else {
              console.warn('Empty transcript received');
              setError('No speech detected. Please try again.');
              setVoiceStatus('idle');
            }
          } catch (error) {
            console.error('ElevenLabs transcription failed, falling back to browser STT:', error);
            setError('ElevenLabs STT failed. Please try browser STT instead.');
            setVoiceStatus('idle');
            
            // Clear error after a few seconds
            setTimeout(() => setError(null), 3000);
          }
          
          // Cleanup
          setMediaRecorder(null);
          setAudioChunks([]);
          audioChunksRef.current = [];
        };
        
        mediaRecorder.stop();
        console.log('Stopping MediaRecorder...');
      } catch (error) {
        console.error('Error stopping ElevenLabs recording:', error);
        setError('Recording failed. Please try again.');
        setMediaRecorder(null);
        setAudioChunks([]);
        audioChunksRef.current = [];
      }
    } else {
      // Handle browser STT
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      // Process the transcript if we have one from browser STT
      if (transcript.trim()) {
        const finalTranscript = transcript.trim();
        
        // Skip text cleanup - send raw transcript directly
        // Send to parent component
        setVoiceStatus('idle');
        onVoiceInput(finalTranscript);
        setTranscript('');
      } else {
        setVoiceStatus('idle');
      }
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setCurrentSTTMethod(null);
  }, [currentSTTMethod, mediaRecorder, audioChunks, transcript, onVoiceInput, transcribeWithElevenLabs]);

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
    <div className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-10 rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 opacity-5 rounded-2xl animate-pulse" />
      
      {/* Main Content */}
      <div className="relative flex flex-col items-center gap-6 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
        {/* Therapist Info */}
        <div className="text-center max-w-lg">
          <p className="text-2xl font-bold text-gray-800 mb-2">
            {therapistName}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {therapist.biography.background}
          </p>
          {hasPermission === false && (
            <p className="text-xs text-orange-600 animate-pulse">
              🎤 Microphone access required
            </p>
          )}
        </div>

        {/* Main Voice Button */}
        <div className="relative">
          {/* Outer Ring Animation */}
          {isRecording && (
            <>
              <div className="absolute inset-0 w-32 h-32 rounded-full bg-red-400 opacity-20 animate-ping" />
              <div className="absolute inset-0 w-32 h-32 rounded-full bg-red-400 opacity-10 animate-ping animation-delay-200" />
            </>
          )}
          
          {/* Shadow and Glow */}
          <div className={`absolute inset-0 w-32 h-32 rounded-full ${
            !hasStarted
              ? 'shadow-lg shadow-blue-500/30'
              : isRecording
                ? 'shadow-xl shadow-red-500/40'
                : isPlayingTTS
                  ? 'shadow-lg shadow-yellow-500/30'
                  : 'shadow-lg shadow-green-500/30'
          }`} />
          
          {/* Main Button */}
          <button
            onClick={handleButtonPress}
            disabled={isProcessing}
            className={`relative flex items-center justify-center w-32 h-32 rounded-full font-medium transition-all transform hover:scale-110 ${
              !hasStarted
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                : isRecording
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  : isPlayingTTS
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
            } ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''} shadow-2xl`}
            style={{
              boxShadow: isRecording 
                ? '0 0 40px rgba(239, 68, 68, 0.5)' 
                : '0 10px 30px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="flex flex-col items-center">
              {!hasStarted ? (
                <Volume2 className="w-12 h-12" />
              ) : isRecording ? (
                <Square className="w-10 h-10" />
              ) : isPlayingTTS ? (
                <VolumeX className="w-12 h-12" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </div>
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
            </div>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex flex-col items-center gap-3">
          {isProcessing && !isPlayingTTS ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              {therapistName} is thinking...
            </div>
          ) : voiceStatus === 'listening' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Listening...
            </div>
          ) : voiceStatus === 'transcribing' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcribing...
            </div>
          ) : voiceStatus === 'thinking' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing speech...
            </div>
          ) : isTranscoding ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcoding voice...
            </div>
          ) : isPlayingTTS ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              {therapistName} is speaking
            </div>
          ) : null}
          
          {/* STT Provider Badge */}
          {currentSTTMethod && (
            <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
              {currentSTTMethod === 'elevenlabs' ? '⚡ ElevenLabs STT' : '🌐 Browser STT'}
            </div>
          )}
        </div>

        {/* Live Transcript */}
        {transcript && (
          <div className="w-full max-w-md bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 shadow-sm">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Live Transcript</p>
            <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50/80 backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-2 max-w-sm border border-red-200/50">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 text-center max-w-xs">
          {!hasStarted
            ? `Tap the button to start your session with ${therapistName}`
            : voiceStatus === 'listening'
              ? "Speak clearly, tap again when done"
              : voiceStatus === 'transcribing'
                ? "Converting your speech to text..."
              : voiceStatus === 'thinking'
                ? "Processing and cleaning up your message..."
              : isTranscoding
                ? "Generating voice response..."
                : isPlayingTTS
                  ? "Tap to interrupt and respond"
                  : "Tap to speak your response"
          }
        </div>
      </div>
      
      {/* Custom CSS for Animation Delay */}
      <style jsx>{`
        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
      `}</style>
    </div>
  );
}