'use client';

import { useState } from 'react';
import { Settings, Volume2, Sparkles } from 'lucide-react';

interface VoiceSettingsProps {
  useElevenLabs: boolean;
  onToggleElevenLabs: (enabled: boolean) => void;
}

export default function VoiceSettings({ useElevenLabs, onToggleElevenLabs }: VoiceSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        title="Voice Settings"
      >
        <Settings className="w-3 h-3" />
        Voice
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Settings Panel */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voice Settings
            </h3>
            
            <div className="space-y-3">
              {/* ElevenLabs Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">ElevenLabs AI</p>
                    <p className="text-xs text-gray-500">Premium natural voices</p>
                  </div>
                </div>
                
                <label className="relative flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={useElevenLabs}
                    onChange={(e) => onToggleElevenLabs(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${
                    useElevenLabs ? 'bg-purple-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      useElevenLabs ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                </label>
              </div>

              {/* Info */}
              <div className="text-xs text-gray-500 border-t pt-2">
                {useElevenLabs ? (
                  <p>✨ Using premium AI voices for natural speech</p>
                ) : (
                  <p>🔊 Using browser&apos;s built-in text-to-speech</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}