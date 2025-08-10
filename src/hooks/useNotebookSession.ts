'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NotebookManager } from '@/core/notebook/NotebookManager';
import { SessionNotebook } from '@/core/notebook/SessionNotebook';
import { LocalFileStorage } from '@/services/storage/LocalFileStorage';

interface UseNotebookSessionState {
  notebook: SessionNotebook | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
}

interface UseNotebookSessionActions {
  createNotebook: (therapistId: string, clientName?: string) => Promise<void>;
  createNewSession: (therapistId: string, clientName?: string) => Promise<void>;
  loadNotebook: (notebookId: string) => Promise<void>;
  saveNotebook: () => Promise<void>;
  completeSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
}

export function useNotebookSession(
  initialTherapistId?: string,
  clientName?: string
): UseNotebookSessionState & UseNotebookSessionActions {
  const [state, setState] = useState<UseNotebookSessionState>({
    notebook: null,
    isLoading: false,
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
        isLoading: false
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
        isLoading: false
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
        isLoading: false
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

  const completeSession = useCallback(async () => {
    if (!managerRef.current || !state.notebook) return;

    try {
      await managerRef.current.completeSession();
      
      setState(prev => ({
        ...prev,
        notebook: null
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
        notebook: null
      }));
    } catch (error) {
      console.error('Failed to abandon session:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to abandon session'
      }));
    }
  }, [state.notebook]);

  return {
    // State
    ...state,
    
    // Actions
    createNotebook,
    createNewSession,
    loadNotebook,
    saveNotebook,
    completeSession,
    abandonSession
  };
}