'use client';

import { useState } from 'react';
import { Archive, ChevronDown, ChevronUp, RotateCcw, Play, Trash2, X, Plus } from 'lucide-react';
import { TherapistStyle } from '@/lib/types';

interface TherapistSelectorProps {
  therapists: TherapistStyle[];
  selectedId: string;
  onSelect: (id: string) => void;
  onStartSession?: (id: string) => void;
  onDeleteTherapist?: (id: string) => void;
  onAddTherapist?: () => void;
}

// Archived therapists data
const ARCHIVED_THERAPISTS: TherapistStyle[] = [
  {
    id: 'michelle-obama',
    name: 'Michelle Obama',
    tagline: 'Values-based prosperity',
    icon: '🌟',
    color: 'therapy-michelle'
  },
  {
    id: 'trevor-noah',
    name: 'Trevor Noah',
    tagline: 'Smart money with humor',
    icon: '😄',
    color: 'therapy-trevor'
  },
  {
    id: 'peter-lynch',
    name: 'Peter Lynch',
    tagline: 'Invest in what you know',
    icon: '📊',
    color: 'therapy-peter'
  },
  {
    id: 'shakespeare',
    name: 'William Shakespeare',
    tagline: 'Financial wisdom in verse',
    icon: '🎭',
    color: 'therapy-shakespeare'
  },
  {
    id: 'mel-robbins',
    name: 'Mel Robbins',
    tagline: 'High-performance mindset',
    icon: '🚀',
    color: 'therapy-mel'
  }
];

export default function TherapistSelector({ therapists, selectedId, onSelect, onStartSession, onDeleteTherapist, onAddTherapist }: TherapistSelectorProps) {
  const [showArchived, setShowArchived] = useState(false);
  
  const handleRestoreTherapist = (therapistId: string) => {
    // This would typically involve updating a state management system
    // For now, we'll just show a notification
    alert(`${ARCHIVED_THERAPISTS.find(t => t.id === therapistId)?.name} would be restored to active therapists.`);
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        Choose Your Financial Coach
      </h3>
      
      {/* Active Therapists */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 justify-items-center">
        {therapists.map((therapist) => (
          <div key={therapist.id} className="relative group">
            <button
              onClick={() => onSelect(therapist.id)}
              className={`flex flex-col items-center p-3 sm:p-4 rounded-xl transition-all duration-200 border-2 w-full max-w-[140px] ${
                therapist.id === selectedId 
                  ? 'bg-blue-50 border-blue-500 shadow-md transform scale-105' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="text-2xl sm:text-3xl mb-2">{therapist.icon}</span>
              <p className={`font-semibold text-xs sm:text-sm text-center mb-1 ${
                therapist.id === selectedId ? 'text-blue-800' : 'text-gray-800'
              }`}>
                {therapist.name}
              </p>
              <p className={`text-xs text-center leading-tight ${
                therapist.id === selectedId ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {therapist.tagline}
              </p>
            </button>
            
            {/* Delete Button (appears on hover) */}
            {onDeleteTherapist && (
              <button
                onClick={() => onDeleteTherapist(therapist.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                title="Delete therapist"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        
      </div>

      {/* Archived Therapists Section */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors py-2"
        >
          <Archive className="w-4 h-4" />
          <span>Backup Bench Advisors ({ARCHIVED_THERAPISTS.length})</span>
          {showArchived ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showArchived && (
          <div className="mt-4 space-y-3">
            <div className="text-xs text-gray-500 text-center mb-3">
              Additional financial advisors on the backup bench - start sessions directly or restore to active roster
            </div>
            
            {ARCHIVED_THERAPISTS.map((therapist) => (
              <div
                key={therapist.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl opacity-60">{therapist.icon}</span>
                  <div>
                    <p className="font-medium text-sm text-gray-700">
                      {therapist.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {therapist.tagline}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onStartSession?.(therapist.id)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    title="Start session with this therapist"
                  >
                    <Play className="w-3 h-3" />
                    Start Session
                  </button>
                  
                  <button
                    onClick={() => handleRestoreTherapist(therapist.id)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    title="Restore therapist to active list"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                  
                  {onDeleteTherapist && (
                    <button
                      onClick={() => onDeleteTherapist(therapist.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                      title="Delete therapist permanently"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {ARCHIVED_THERAPISTS.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                No archived therapists
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}