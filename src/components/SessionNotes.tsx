'use client';

import { useState } from 'react';
import { FileText, Target, Brain, ChevronRight } from 'lucide-react';
import { TherapistNote, TherapistPersonality, UserProfile } from '@/lib/types';

interface SessionNotesProps {
  notes: TherapistNote[];
  therapist: TherapistPersonality;
  userProfile: UserProfile | null;
}

export default function SessionNotes({ notes, therapist, userProfile }: SessionNotesProps) {
  const [showCover, setShowCover] = useState(true);
  
  // Get user name from profile or extract from notes as fallback
  const getUserName = () => {
    if (userProfile?.name && userProfile.name.trim() !== '') {
      return userProfile.name;
    }
    
    // Fallback: try to extract name from therapist notes
    for (const note of notes) {
      // Look for patterns like "Client name: Sunil" or "name: Sunil"
      const nameMatch = note.note.match(/(?:client name:|name:)\s*([a-zA-Z]+)/i);
      if (nameMatch) {
        return nameMatch[1];
      }
      
      // Also look for patterns in the note content that might contain the name
      const contentMatch = note.note.match(/\b([A-Z][a-z]+)\b/);
      if (contentMatch && !['Client', 'Setting', 'Establishing'].includes(contentMatch[1])) {
        return contentMatch[1];
      }
    }
    
    return null;
  };
  
  const userName = getUserName();
  
  // Track which lifestyle areas have been covered
  const getLifestyleProgress = () => {
    const defaultProgress = {
      housing: '○',
      food: '○',
      transport: '○',
      fitness: '○',
      entertainment: '○',
      subscriptions: '○',
      travel: '○',
      basics: '○',
      completed: 0,
      total: 8
    };
    
    if (!userProfile) return defaultProgress;
    
    const progress = {
      housing: userProfile.lifestyle?.housing?.preference ? '✓' : '○',
      food: userProfile.lifestyle?.food?.preference ? '✓' : '○',
      transport: userProfile.lifestyle?.transport?.preference ? '✓' : '○',
      fitness: userProfile.lifestyle?.fitness?.preference ? '✓' : '○',
      entertainment: userProfile.lifestyle?.entertainment?.preference ? '✓' : '○',
      subscriptions: userProfile.lifestyle?.subscriptions?.preference ? '✓' : '○',
      travel: userProfile.lifestyle?.travel?.preference ? '✓' : '○',
      basics: (userProfile.name && userProfile.age && userProfile.location) ? '✓' : '○'
    };
    
    const completed = Object.values(progress).filter(v => v === '✓').length;
    const total = Object.keys(progress).length;
    
    return { ...progress, completed, total };
  };
  
  const progress = getLifestyleProgress();
  
  // Determine current target based on latest note topic
  const getCurrentTarget = () => {
    if (notes.length === 0) return 'basics';
    const latestNote = notes[notes.length - 1];
    const topic = latestNote.topic;
    
    // Map conversation topics to our tracking categories
    const topicMap: {[key: string]: string} = {
      'intro': 'basics',
      'name': 'basics', 
      'age': 'basics',
      'housing_location': 'basics',
      'housing_preference': 'housing',
      'food_preference': 'food',
      'transport_preference': 'transport',
      'fitness_preference': 'fitness',
      'entertainment_preference': 'entertainment',
      'subscriptions_preference': 'subscriptions',
      'travel_preference': 'travel'
    };
    
    return topicMap[topic] || 'basics';
  };
  
  const currentTarget = getCurrentTarget();

  // Auto-flip to notes page when conversation starts (therapist takes notes)
  if (showCover && notes.length > 0) {
    setShowCover(false);
  }
  
  if (showCover) {
    // COVER PAGE - Therapist Information
    return (
      <div className="flex-1 h-fit relative">
        {/* Page turning shadow effect */}
        <div className="absolute -top-1 -right-1 w-full h-full bg-gray-300 rounded-lg transform rotate-1 opacity-30"></div>
        <div className="absolute -top-0.5 -right-0.5 w-full h-full bg-gray-200 rounded-lg transform rotate-0.5 opacity-50"></div>
        
        {/* Cover Page */}
        <div 
          className="relative bg-white rounded-lg shadow-2xl p-8 border border-gray-400 min-h-[600px]"
        >
          {/* Spiral Binding Area */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-blue-200 to-blue-100 rounded-l-lg border-r border-blue-300"></div>
          
          {/* Spiral Binding Holes */}
          <div className="absolute left-2 top-6 bottom-6 flex flex-col justify-between w-6 z-10">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-white border-2 border-gray-600 rounded-full shadow-inner mx-auto"></div>
            ))}
          </div>

          {/* Cover Title */}
          <div className="text-center mt-12 ml-8">
            <h1 className="font-caveat text-4xl font-bold text-gray-800 mb-4">
              Financial Coaching Session
            </h1>
            <div className="w-48 h-1 bg-gray-600 mx-auto mb-8"></div>
          </div>

          {/* Therapist Info */}
          <div className="ml-10 space-y-6">
            <div className="text-center">
              <span className="text-6xl mb-4 block">{therapist.icon}</span>
              <h2 className="font-caveat text-3xl font-bold text-gray-800 mb-2">
                {therapist.name}
              </h2>
              <p className="font-kalam text-lg text-gray-700 italic">
                {therapist.tagline}
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-6 mt-8">
              <h3 className="font-caveat text-xl font-bold mb-3 flex items-center gap-2 text-gray-800">
                <Brain className="w-5 h-5" /> Coaching Approach
              </h3>
              <p className="font-kalam text-sm text-gray-700 leading-relaxed mb-4">
                {therapist.conversationStyle.approach}
              </p>
              
              <div>
                <p className="font-caveat text-lg font-semibold text-gray-800 mb-2">Areas of Expertise:</p>
                <ul className="font-kalam text-sm text-gray-700 space-y-1">
                  {therapist.biography.expertise.slice(0, 4).map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Therapist's notebook indication */}
          <div className="absolute bottom-8 right-8 flex items-center gap-2 text-gray-600">
            <span className="font-kalam text-sm italic">Therapist&apos;s Notes</span>
          </div>
        </div>
      </div>
    );
  }

  // NOTES PAGE - Session Content
  return (
    <div className="flex-1 h-fit relative">
      {/* Page turning shadow effect */}
      <div className="absolute -top-1 -right-1 w-full h-full bg-gray-300 rounded-lg transform rotate-1 opacity-30"></div>
      <div className="absolute -top-0.5 -right-0.5 w-full h-full bg-gray-200 rounded-lg transform rotate-0.5 opacity-50"></div>
      
      {/* Notes Page */}
      <div 
        className="relative bg-white rounded-lg shadow-2xl p-6 border border-gray-300 min-h-[600px]"
        style={{
          backgroundImage: `
            linear-gradient(transparent 28px, #e2e8f0 29px, #e2e8f0 30px, transparent 31px),
            linear-gradient(90deg, transparent 32px, #fca5a5 33px, #fca5a5 34px, transparent 35px)
          `,
          backgroundSize: '100% 30px, 100% 100%',
          backgroundPosition: '0 0, 0 0'
        }}
      >
        {/* Spiral Binding Area */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-red-200 to-red-100 rounded-l-lg border-r border-red-300"></div>
        
        {/* Spiral Binding Holes */}
        <div className="absolute left-2 top-6 bottom-6 flex flex-col justify-between w-6 z-10">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-white border-2 border-gray-500 rounded-full shadow-inner mx-auto"></div>
          ))}
        </div>

        {/* Back to Cover Button */}
        <button 
          onClick={() => setShowCover(true)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 font-kalam text-xs"
        >
          ← Cover
        </button>

        {/* Page Header with User Name */}
        <div className="ml-10 mb-6">
          <h3 className="font-caveat text-2xl font-bold text-blue-900 transform -rotate-1">
            Session Note for {userName || 'Client'}
          </h3>
          <div className="w-28 h-0.5 bg-blue-700 mt-2 transform -rotate-1"></div>
        </div>
      
        {/* Notes Content */}
        <div className="space-y-3 max-h-[280px] overflow-y-auto ml-10">
          {notes.length === 0 ? (
            <p className="font-kalam text-lg text-gray-600 italic transform rotate-1">
              Session notes will appear here...
            </p>
          ) : (
            notes.map((note, index) => (
              <div key={`${note.time}-${index}`} className="pb-3">
                <p className="font-kalam text-sm text-blue-600 transform -rotate-1">
                  {note.time}
                </p>
                <p className="font-kalam text-base text-blue-900 mt-1 leading-relaxed transform rotate-0.5" 
                   style={{ 
                     textShadow: '0.5px 0.5px 0px rgba(0,0,0,0.1)',
                     marginLeft: `${Math.random() * 4}px` 
                   }}>
                  {note.note}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Current Goal Metrics */}
        <div className="absolute bottom-6 left-10 right-6">
          <div className="border-t-2 border-dashed border-blue-300 pt-3">
            <h4 className="font-caveat text-lg font-bold mb-2 flex items-center gap-2 text-blue-800">
              <Target className="w-4 h-4" /> Current Progress
            </h4>
            <div className="font-kalam text-xs text-blue-700 leading-relaxed">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Lifestyle Cost Variables:</span>
                <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-bold">
                  {progress.completed}/{progress.total}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-1 text-xs">
                <span className={
                  progress.basics === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'basics'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.basics === '✓' ? '✓' : '○'} Basics
                </span>
                <span className={
                  progress.housing === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'housing'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.housing === '✓' ? '✓' : '○'} Housing
                </span>
                <span className={
                  progress.food === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'food'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.food === '✓' ? '✓' : '○'} Food
                </span>
                <span className={
                  progress.transport === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'transport'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.transport === '✓' ? '✓' : '○'} Transport
                </span>
                <span className={
                  progress.fitness === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'fitness'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.fitness === '✓' ? '✓' : '○'} Fitness
                </span>
                <span className={
                  progress.entertainment === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'entertainment'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.entertainment === '✓' ? '✓' : '○'} Fun
                </span>
                <span className={
                  progress.subscriptions === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'subscriptions'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.subscriptions === '✓' ? '✓' : '○'} Services
                </span>
                <span className={
                  progress.travel === '✓' 
                    ? 'text-green-600 font-semibold' 
                    : currentTarget === 'travel'
                      ? 'text-blue-600 font-bold bg-blue-100 px-1 rounded'
                      : 'text-gray-500'
                }>
                  {progress.travel === '✓' ? '✓' : '○'} Travel
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}