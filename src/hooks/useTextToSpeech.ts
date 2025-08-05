'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface TextToSpeechOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        }
      };

      // Load voices immediately if available
      loadVoices();

      // Also listen for the voiceschanged event (for some browsers)
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const getVoiceForTherapist = useCallback((therapistId: string): SpeechSynthesisVoice | undefined => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;

    const voices = window.speechSynthesis.getVoices();
    
    // Voice mappings based on therapist gender and style
    const voicePreferences: Record<string, string[]> = {
      'mel-robbins': ['Samantha', 'Karen', 'Susan', 'female'], // Female, energetic
      'aja-evans': ['Samantha', 'Karen', 'Victoria', 'female'], // Female, warm
      'ramit-sethi': ['Alex', 'Daniel', 'David', 'male'], // Male, confident
      'nora-ephron': ['Samantha', 'Karen', 'Moira', 'female'], // Female, witty
      'michelle-obama': ['Samantha', 'Karen', 'Victoria', 'female'] // Female, authoritative
    };

    const preferences = voicePreferences[therapistId] || ['female'];
    
    // Try to find a preferred voice
    for (const preference of preferences) {
      const voice = voices.find(v => 
        v.name.toLowerCase().includes(preference.toLowerCase()) ||
        (preference === 'female' && v.name.toLowerCase().includes('female')) ||
        (preference === 'male' && v.name.toLowerCase().includes('male'))
      );
      if (voice) return voice;
    }

    // Fallback to any available voice with appropriate gender
    const genderPreference = therapistId === 'ramit-sethi' ? 'male' : 'female';
    return voices.find(v => 
      v.name.toLowerCase().includes(genderPreference) ||
      (genderPreference === 'female' && !v.name.toLowerCase().includes('male'))
    ) || voices[0];
  }, []);

  const speak = useCallback((text: string, therapistId: string, options: TextToSpeechOptions = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = options.voice || getVoiceForTherapist(therapistId);
    
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 0.8;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getVoiceForTherapist]);

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isPlaying,
    isPaused,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window
  };
};