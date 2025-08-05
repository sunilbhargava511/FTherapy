'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import TherapistSelector from '@/components/TherapistSelector';
import { TherapistStyle } from '@/lib/types';

const THERAPIST_STYLES: TherapistStyle[] = [
  {
    id: 'danielle-town',
    name: 'Danielle Town',
    tagline: 'Smart investing & wealth building',
    icon: '📈',
    color: 'therapy-danielle'
  },
  {
    id: 'aja-evans',
    name: 'Aja Evans',
    tagline: 'Emotional money wellness',
    icon: '💜',
    color: 'therapy-aja'
  },
  {
    id: 'ramit-sethi',
    name: 'Ramit Sethi',
    tagline: 'Design your rich life',
    icon: '💎',
    color: 'therapy-ramit'
  },
  {
    id: 'nora-ephron',
    name: 'Nora Ephron',
    tagline: 'Witty financial wisdom',
    icon: '✨',
    color: 'therapy-nora'
  },
  {
    id: 'anita-bhargava',
    name: 'Anita Bhargava',
    tagline: 'Cultural financial wisdom & empowerment',
    icon: '🪷',
    color: 'therapy-anita'
  }
];

export default function Home() {
  const [selectedTherapist, setSelectedTherapist] = useState<string>('danielle-town');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-6">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Financial Lifestyle Coaching
          </h1>
          <p className="text-gray-600">
            Transform your relationship with money
          </p>
        </header>

        <div className="max-w-6xl mx-auto">
          <TherapistSelector
            therapists={THERAPIST_STYLES}
            selectedId={selectedTherapist}
            onSelect={setSelectedTherapist}
          />

          <ChatInterface selectedTherapistId={selectedTherapist} />
        </div>
      </div>
    </div>
  );
}