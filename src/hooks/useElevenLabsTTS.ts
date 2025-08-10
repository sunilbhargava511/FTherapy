'use client';

import { useState, useRef, useCallback } from 'react';
import { elevenLabsAPI, APIError } from '@/lib/api-client';

export const useElevenLabsTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const speak = useCallback(async (text: string, therapistId: string) => {
    if (!text.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Clean up previous audio URL
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }

      // Use the centralized API client but handle blob response manually
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          therapistId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadstart = () => setIsLoading(true);
      audio.oncanplay = () => setIsLoading(false);
      
      audio.onplay = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };

      audio.onpause = () => {
        setIsPaused(true);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        // Clean up URL when audio ends
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoading(false);
      };

      await audio.play();

    } catch (err) {
      console.error('ElevenLabs TTS error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsPlaying(false);
      setIsPaused(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  const resume = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error('Error resuming audio:', err);
        setError('Failed to resume audio');
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setIsPlaying(false);
    setIsPaused(false);
    
    // Clean up URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isPlaying,
    isPaused,
    isLoading,
    error,
    isSupported: true, // ElevenLabs works in all modern browsers
  };
};