'use client';

import { TherapistStyle } from '@/lib/types';

interface TherapistSelectorProps {
  therapists: TherapistStyle[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function TherapistSelector({ therapists, selectedId, onSelect }: TherapistSelectorProps) {
  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
        Choose Your Financial Coach
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 justify-items-center">
        {therapists.map((therapist) => (
          <button
            key={therapist.id}
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
        ))}
      </div>
    </div>
  );
}