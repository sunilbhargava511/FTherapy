'use client';

import { ConversationMessage, TherapistNote, ConversationTopic, UserProfile } from '@/lib/types';
import { QualitativeReport, QuantitativeReport } from '@/core/notebook/types';
import { useNotebookSession } from './useNotebookSession';
import { useNotebookContent } from './useNotebookContent';
import { useNotebookReports } from './useNotebookReports';

interface UseNotebookState {
  notebook: any;
  isLoading: boolean;
  isGeneratingReports: boolean;
  hasReports: boolean;
  error: string | null;
  lastSaved: Date | null;
  lastUpdated?: number; // Track when notebook was last updated to force re-renders
}

interface UseNotebookActions {
  // Core notebook operations
  createNotebook: (therapistId: string, clientName?: string) => Promise<void>;
  createNewSession: (therapistId: string, clientName?: string) => Promise<void>;
  loadNotebook: (notebookId: string) => Promise<void>;
  saveNotebook: () => Promise<void>;
  
  // Content management  
  addMessage: (message: ConversationMessage) => void;
  addNote: (note: TherapistNote) => void;
  updateTopic: (topic: ConversationTopic) => void;
  updateProfile: (profileData: Partial<UserProfile>) => void;
  
  // Report generation
  generateReports: () => Promise<{ qualitative: QualitativeReport; quantitative: QuantitativeReport } | null>;
  
  // Session management
  completeSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  
  // Data access
  getMessages: () => ConversationMessage[];
  getNotes: () => TherapistNote[];
  getCurrentTopic: () => ConversationTopic;
  getUserProfile: () => any;
}

export function useNotebook(
  initialTherapistId?: string,
  clientName?: string
): UseNotebookState & UseNotebookActions {
  // Use specialized hooks
  const session = useNotebookSession(initialTherapistId, clientName);
  const content = useNotebookContent(session.notebook);
  const reports = useNotebookReports(session.notebook, session.saveNotebook);

  // Combine error states (prioritize session errors, then report errors)
  const error = session.error || reports.error;

  return {
    // Combined state
    notebook: session.notebook,
    isLoading: session.isLoading,
    isGeneratingReports: reports.isGeneratingReports,
    hasReports: reports.hasReports,
    error,
    lastSaved: session.lastSaved,
    lastUpdated: content.lastUpdated,
    
    // Session actions
    createNotebook: session.createNotebook,
    createNewSession: session.createNewSession,
    loadNotebook: session.loadNotebook,
    saveNotebook: session.saveNotebook,
    completeSession: session.completeSession,
    abandonSession: session.abandonSession,
    
    // Content actions
    addMessage: content.addMessage,
    addNote: content.addNote,
    updateTopic: content.updateTopic,
    updateProfile: content.updateProfile,
    getMessages: content.getMessages,
    getNotes: content.getNotes,
    getCurrentTopic: content.getCurrentTopic,
    getUserProfile: content.getUserProfile,
    
    // Report actions
    generateReports: reports.generateReports
  };
}