'use client';

import { FileText, Brain } from 'lucide-react';
import { TherapistNote, TherapistPersonality } from '@/lib/types';

interface SessionNotesProps {
  notes: TherapistNote[];
  therapist: TherapistPersonality;
}

export default function SessionNotes({ notes, therapist }: SessionNotesProps) {
  return (
    <div className="w-80 bg-white rounded-2xl shadow-xl p-4 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-800">Session Notes</h3>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Notes will appear as we talk...</p>
        ) : (
          notes.map((note, index) => (
            <div key={`${note.time}-${index}`} className="border-b pb-2 last:border-b-0">
              <p className="text-xs text-gray-500">{note.time}</p>
              <p className="text-sm text-gray-700 mt-1">{note.note}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
          <Brain className="w-4 h-4" /> Approach
        </h4>
        <p className="text-xs text-gray-600">
          {therapist.conversationStyle.approach}
        </p>
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-700">Expertise:</p>
          <p className="text-xs text-gray-600">
            {therapist.biography.expertise.slice(0, 3).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}