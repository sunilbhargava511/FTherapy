'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isDisabled?: boolean;
}

export default function VoiceInput({ onTranscript, isDisabled = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [accumulatedText, setAccumulatedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if speech recognition is available
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Process only new results starting from the last result index
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Only add new final results to accumulated text
        if (finalTranscript) {
          setAccumulatedText(prev => prev + finalTranscript);
        }
        
        // Set interim text (this gets overwritten each time)
        setInterimText(interimTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
        setAccumulatedText('');
      };

      recognition.onend = () => {
        // Only reset if we're not intentionally stopping
        if (isListening) {
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, isListening, accumulatedText, interimText]);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isDisabled) {
      recognitionRef.current.start();
      setIsListening(true);
      setInterimText('');
      setAccumulatedText('');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Submit the accumulated text
      const finalText = (accumulatedText + interimText).trim();
      if (finalText) {
        onTranscript(finalText);
      }
      
      // Clear both texts
      setInterimText('');
      setAccumulatedText('');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Don't render if speech recognition is not available
  if (typeof window === 'undefined' || (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window))) {
    return null;
  }

  const displayText = accumulatedText + interimText;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={toggleListening}
        disabled={isDisabled}
        className={`voice-button ${
          isListening ? 'voice-button-listening' : 'voice-button-idle'
        }`}
        title={isListening ? 'Click to stop recording and submit' : 'Click to start recording'}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      
      {isListening && (
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 max-w-xs">
          <p className="text-xs text-blue-600 mb-1">Recording... (click mic to stop)</p>
          {displayText && (
            <p className="text-sm text-blue-700">
              <span className="font-medium">{accumulatedText}</span>
              <span className="italic opacity-75">{interimText}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}