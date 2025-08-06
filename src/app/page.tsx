'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import TherapistSelector from '@/components/TherapistSelector';
import AddTherapistModal from '@/components/AddTherapistModal';
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
  const [activeTherapists, setActiveTherapists] = useState(THERAPIST_STYLES);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleStartSession = (therapistId: string) => {
    // Launch session directly with any therapist (active or backup)
    setSelectedTherapist(therapistId);
  };

  const handleDeleteTherapist = (therapistId: string) => {
    // Confirm deletion
    const therapist = activeTherapists.find(t => t.id === therapistId);
    if (confirm(`Are you sure you want to delete ${therapist?.name}? This action cannot be undone.`)) {
      // Remove from localStorage if it's a custom therapist
      try {
        const existingCustom = localStorage.getItem('customTherapists');
        if (existingCustom) {
          const customTherapists = JSON.parse(existingCustom);
          const updatedCustom = customTherapists.filter((t: TherapistStyle) => t.id !== therapistId);
          localStorage.setItem('customTherapists', JSON.stringify(updatedCustom));
        }
      } catch (error) {
        console.error('Error removing custom therapist from storage:', error);
      }
      
      // Remove from active therapists
      setActiveTherapists(prev => prev.filter(t => t.id !== therapistId));
      
      // If the deleted therapist was selected, switch to first available
      if (selectedTherapist === therapistId) {
        const remaining = activeTherapists.filter(t => t.id !== therapistId);
        if (remaining.length > 0) {
          setSelectedTherapist(remaining[0].id);
        }
      }
    }
  };

  const handleAddTherapist = () => {
    setShowAddModal(true);
  };

  const handleSaveTherapist = (newTherapist: TherapistStyle) => {
    // Save to localStorage for persistence
    try {
      const existingCustom = localStorage.getItem('customTherapists');
      const customTherapists = existingCustom ? JSON.parse(existingCustom) : [];
      customTherapists.push(newTherapist);
      localStorage.setItem('customTherapists', JSON.stringify(customTherapists));
    } catch (error) {
      console.error('Error saving custom therapist:', error);
    }
    
    // Add to active therapists
    setActiveTherapists(prev => [...prev, newTherapist]);
    setShowAddModal(false);
    
    // Select the new therapist
    setSelectedTherapist(newTherapist.id);
  };

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
            therapists={activeTherapists}
            selectedId={selectedTherapist}
            onSelect={setSelectedTherapist}
            onStartSession={handleStartSession}
            onDeleteTherapist={handleDeleteTherapist}
            onAddTherapist={handleAddTherapist}
          />

          <ChatInterface selectedTherapistId={selectedTherapist} />
          
          {/* Add Therapist Modal */}
          <AddTherapistModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveTherapist}
          />
        </div>
      </div>
    </div>
  );
}