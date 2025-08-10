'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NotebookManager } from '@/core/notebook/NotebookManager';
import { SessionNotebook } from '@/core/notebook/SessionNotebook';
import { LocalFileStorage } from '@/services/storage/LocalFileStorage';
import { ConversationMessage, TherapistNote, ConversationTopic, UserProfile } from '@/lib/types';
import { QualitativeReport, QuantitativeReport } from '@/core/notebook/types';
import { notebookAPI, APIError } from '@/lib/api-client';

interface UseNotebookState {
  notebook: SessionNotebook | null;
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
  const [state, setState] = useState<UseNotebookState>({
    notebook: null,
    isLoading: false,
    isGeneratingReports: false,
    hasReports: false,
    error: null,
    lastSaved: null
  });

  const managerRef = useRef<NotebookManager | null>(null);

  // Initialize manager
  useEffect(() => {
    const storage = new LocalFileStorage();
    managerRef.current = new NotebookManager(storage);
  }, []);

  const createNotebook = useCallback(async (therapistId: string, clientName?: string) => {
    if (!managerRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const notebook = await managerRef.current.createOrRestore(therapistId, clientName);
      
      setState(prev => ({
        ...prev,
        notebook,
        isLoading: false,
        hasReports: notebook.hasReports()
      }));

      console.log('✅ Notebook created/restored:', notebook.getId());
    } catch (error) {
      console.error('Failed to create notebook:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create session',
        isLoading: false
      }));
    }
  }, []);

  const createNewSession = useCallback(async (therapistId: string, clientName?: string) => {
    if (!managerRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const notebook = await managerRef.current.createNew(therapistId, clientName);
      
      setState(prev => ({
        ...prev,
        notebook,
        isLoading: false,
        hasReports: notebook.hasReports()
      }));

      console.log('✅ New notebook session created:', notebook.getId());
    } catch (error) {
      console.error('Failed to create new session:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create new session',
        isLoading: false
      }));
    }
  }, []);

  // Auto-create fresh notebook when therapist ID changes
  useEffect(() => {
    if (initialTherapistId && managerRef.current) {
      // Always create new session when therapist changes
      createNewSession(initialTherapistId, clientName);
    }
  }, [initialTherapistId, clientName, createNewSession]);

  const saveNotebook = useCallback(async () => {
    if (!managerRef.current || !state.notebook) return;

    try {
      await managerRef.current.save();
      setState(prev => ({
        ...prev,
        lastSaved: new Date(),
        error: null
      }));
    } catch (error) {
      console.error('Failed to save notebook:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to save session'
      }));
    }
  }, [state.notebook]);

  // Auto-save on changes
  useEffect(() => {
    if (state.notebook?.hasChanges()) {
      const timer = setTimeout(() => {
        saveNotebook();
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [state.notebook, saveNotebook]);

  const loadNotebook = useCallback(async (notebookId: string) => {
    if (!managerRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const notebook = await managerRef.current.load(notebookId);
      
      if (!notebook) {
        throw new Error('Notebook not found');
      }

      setState(prev => ({
        ...prev,
        notebook,
        isLoading: false,
        hasReports: notebook.hasReports()
      }));
    } catch (error) {
      console.error('Failed to load notebook:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load session',
        isLoading: false
      }));
    }
  }, []);

  const addMessage = useCallback((message: ConversationMessage) => {
    if (!state.notebook) return;

    state.notebook.addMessage(message);
    
    // Trigger re-render by creating new object reference
    setState(prev => ({
      ...prev,
      notebook: Object.assign(Object.create(Object.getPrototypeOf(state.notebook)), state.notebook),
      lastUpdated: Date.now() // Additional change to ensure React detects update
    }));
  }, [state.notebook]);

  const addNote = useCallback((note: TherapistNote) => {
    if (!state.notebook) return;

    state.notebook.addNote(note);
    
    // Trigger re-render by creating new object reference
    setState(prev => ({
      ...prev,
      notebook: Object.assign(Object.create(Object.getPrototypeOf(state.notebook)), state.notebook),
      lastUpdated: Date.now()
    }));
  }, [state.notebook]);

  const updateTopic = useCallback((topic: ConversationTopic) => {
    if (!state.notebook) return;

    state.notebook.updateTopic(topic);
    
    // Trigger re-render by creating new object reference
    setState(prev => ({
      ...prev,
      notebook: Object.assign(Object.create(Object.getPrototypeOf(state.notebook)), state.notebook),
      lastUpdated: Date.now()
    }));
  }, [state.notebook]);

  const updateProfile = useCallback((profileData: Partial<UserProfile>) => {
    if (!state.notebook) return;

    state.notebook.updateProfile(profileData);
    
    // Trigger re-render by creating new object reference
    setState(prev => ({
      ...prev,
      notebook: Object.assign(Object.create(Object.getPrototypeOf(state.notebook)), state.notebook),
      lastUpdated: Date.now()
    }));
  }, [state.notebook]);

  const generateReports = useCallback(async () => {
    if (!state.notebook) return null;

    setState(prev => ({ ...prev, isGeneratingReports: true, error: null }));
    
    try {
      // Call the API endpoint to generate reports
      const result = await notebookAPI.generateReports(state.notebook.getId());
      
      // Update notebook with reports
      const reports = result.data as any;
      state.notebook.attachQualitativeReport(reports.reports.qualitative);
      state.notebook.attachQuantitativeReport(reports.reports.quantitative);
      
      setState(prev => ({
        ...prev,
        isGeneratingReports: false,
        hasReports: true,
        notebook: state.notebook
      }));

      // Auto-save after generating reports
      await saveNotebook();
      
      return reports.reports;
    } catch (error) {
      console.error('Failed to generate reports:', error);
      setState(prev => ({
        ...prev,
        isGeneratingReports: false,
        error: 'Failed to generate reports'
      }));
      return null;
    }
  }, [state.notebook, saveNotebook]);

  const completeSession = useCallback(async () => {
    if (!managerRef.current || !state.notebook) return;

    try {
      await managerRef.current.completeSession();
      
      setState(prev => ({
        ...prev,
        notebook: null,
        hasReports: false
      }));
    } catch (error) {
      console.error('Failed to complete session:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to complete session'
      }));
    }
  }, [state.notebook]);

  const abandonSession = useCallback(async () => {
    if (!managerRef.current || !state.notebook) return;

    try {
      await managerRef.current.abandonSession();
      
      setState(prev => ({
        ...prev,
        notebook: null,
        hasReports: false
      }));
    } catch (error) {
      console.error('Failed to abandon session:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to abandon session'
      }));
    }
  }, [state.notebook]);

  // Data access helpers
  const getMessages = useCallback((): ConversationMessage[] => {
    return state.notebook?.getMessages() || [];
  }, [state.notebook, state.lastUpdated]); // Add lastUpdated as dependency to force re-computation

  const getNotes = useCallback((): TherapistNote[] => {
    return state.notebook?.getNotes() || [];
  }, [state.notebook, state.lastUpdated]);

  const getCurrentTopic = useCallback((): ConversationTopic => {
    return state.notebook?.getCurrentTopic() || 'intro';
  }, [state.notebook, state.lastUpdated]);

  const getUserProfile = useCallback(() => {
    return state.notebook?.getUserProfile() || {};
  }, [state.notebook, state.lastUpdated]);

  return {
    // State
    ...state,
    
    // Actions
    createNotebook,
    createNewSession,
    loadNotebook,
    saveNotebook,
    addMessage,
    addNote,
    updateTopic,
    updateProfile,
    generateReports,
    completeSession,
    abandonSession,
    getMessages,
    getNotes,
    getCurrentTopic,
    getUserProfile
  };
}