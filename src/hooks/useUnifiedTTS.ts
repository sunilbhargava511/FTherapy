'use client';

import { useElevenLabsTTS } from './useElevenLabsTTS';
import { useTextToSpeech } from './useTextToSpeech';

export const useUnifiedTTS = (useElevenLabs: boolean = true) => {
  const elevenLabsTTS = useElevenLabsTTS();
  const browserTTS = useTextToSpeech();

  if (useElevenLabs) {
    return {
      ...elevenLabsTTS,
      provider: 'elevenlabs' as const,
    };
  } else {
    return {
      ...browserTTS,
      provider: 'browser' as const,
      isLoading: false,
      error: null,
    };
  }
};