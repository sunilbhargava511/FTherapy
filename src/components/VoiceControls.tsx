'use client';

import { useState } from 'react';
import { Settings, RotateCcw } from 'lucide-react';

import type { VoiceControlSettings } from '@/lib/types';

interface VoiceControlsProps {
  settings: VoiceControlSettings;
  onSettingsChange: (settings: VoiceControlSettings) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const PRESETS = {
  quickChat: {
    name: 'Quick Chat',
    description: 'Rapid, casual conversations',
    settings: {
      responseLength: 2,
      speakingPace: 4,
      engagement: 1,
      style: 1,
      sttProvider: 'elevenlabs' as const
    }
  },
  learning: {
    name: 'Learning Mode',
    description: 'Educational interactions',
    settings: {
      responseLength: 4,
      speakingPace: 2,
      engagement: 4,
      style: 5,
      sttProvider: 'elevenlabs' as const
    }
  },
  professional: {
    name: 'Professional',
    description: 'Business/formal interactions',
    settings: {
      responseLength: 3,
      speakingPace: 3,
      engagement: 3,
      style: 4,
      sttProvider: 'elevenlabs' as const
    }
  },
  storyteller: {
    name: 'Storyteller',
    description: 'Narrative-focused conversations',
    settings: {
      responseLength: 5,
      speakingPace: 2,
      engagement: 5,
      style: 5,
      sttProvider: 'elevenlabs' as const
    }
  }
};

const PARAMETER_LABELS = {
  responseLength: {
    name: 'Response Length',
    labels: ['', 'Very Brief', 'Brief', 'Standard', 'Detailed', 'Very Detailed']
  },
  speakingPace: {
    name: 'Speaking Pace',
    labels: ['', 'Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast']
  },
  engagement: {
    name: 'Engagement',
    labels: ['', 'Mostly Humor', 'More Humor', 'Balanced Mix', 'More Stories', 'Mostly Stories']
  },
  style: {
    name: 'Style',
    labels: ['', 'Always Asking', 'Mostly Asking', 'Interactive', 'Mostly Telling', 'Always Telling']
  }
};

export default function VoiceControls({
  settings,
  onSettingsChange,
  isExpanded,
  onToggle
}: VoiceControlsProps) {
  const handleSliderChange = (parameter: keyof VoiceControlSettings, value: number | string) => {
    onSettingsChange({
      ...settings,
      [parameter]: value
    });
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    onSettingsChange(PRESETS[presetKey].settings);
  };

  const resetToDefaults = () => {
    onSettingsChange({
      responseLength: 3,
      speakingPace: 3,
      engagement: 3,
      style: 3,
      sttProvider: 'elevenlabs'
    });
  };

  const SliderControl = ({ 
    parameter, 
    value 
  }: { 
    parameter: keyof VoiceControlSettings;
    value: number;
  }) => {
    const config = PARAMETER_LABELS[parameter];
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700">
            {config.name}
          </label>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {config.labels[value]}
          </span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={value}
            onChange={(e) => handleSliderChange(parameter, parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            {[1, 2, 3, 4, 5].map(num => (
              <span key={num} className="w-4 text-center">{num}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-800">Voice Controls</span>
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Presets */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as keyof typeof PRESETS)}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="text-sm font-medium text-gray-800">{preset.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-6">
            <SliderControl parameter="responseLength" value={settings.responseLength} />
            <SliderControl parameter="speakingPace" value={settings.speakingPace} />
            <SliderControl parameter="engagement" value={settings.engagement} />
            <SliderControl parameter="style" value={settings.style} />
          </div>

          {/* STT Provider Toggle */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-700">
                Speech Recognition
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${settings.sttProvider === 'browser' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Browser
                </span>
                <button
                  onClick={() => handleSliderChange('sttProvider', settings.sttProvider === 'elevenlabs' ? 'browser' : 'elevenlabs')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    settings.sttProvider === 'elevenlabs' ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.sttProvider === 'elevenlabs' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs ${settings.sttProvider === 'elevenlabs' ? 'text-gray-500' : 'text-gray-400'}`}>
                  ElevenLabs
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {settings.sttProvider === 'elevenlabs' 
                ? 'Higher accuracy cloud-based speech recognition' 
                : 'Free browser-based speech recognition (fallback)'
              }
            </p>
          </div>

          {/* Reset Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}